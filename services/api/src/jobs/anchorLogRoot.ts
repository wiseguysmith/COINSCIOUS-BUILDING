import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

/**
 * Daily job to compute Merkle roots for admin actions and commit them on-chain
 * 
 * This job runs daily to:
 * 1. Fetch all admin actions for the previous UTC day
 * 2. Build a Merkle tree from the actions
 * 3. Commit the root to the LogAnchor contract
 * 4. Store the root locally for verification
 */

interface AdminAction {
  id: string;
  orgId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  meta: any;
  createdAt: Date;
}

interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
}

/**
 * Convert a date to UTC day format (YYYYMMDD)
 */
function dateToUTCDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return parseInt(`${year}${month}${day}`);
}

/**
 * Create a canonical hash for an admin action
 */
function hashAdminAction(action: AdminAction): string {
  const canonical = {
    id: action.id,
    orgId: action.orgId,
    actorId: action.actorId,
    action: action.action,
    targetType: action.targetType,
    targetId: action.targetId,
    reason: action.reason,
    meta: action.meta,
    createdAt: action.createdAt.toISOString()
  };
  
  const json = JSON.stringify(canonical, Object.keys(canonical).sort());
  return createHash('sha256').update(json).digest('hex');
}

/**
 * Build a Merkle tree from an array of hashes
 */
function buildMerkleTree(hashes: string[]): MerkleNode | null {
  if (hashes.length === 0) return null;
  if (hashes.length === 1) return { hash: hashes[0] };
  
  const nodes: MerkleNode[] = hashes.map(hash => ({ hash }));
  
  while (nodes.length > 1) {
    const newLevel: MerkleNode[] = [];
    
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1] || left; // Duplicate last node if odd
      
      const combined = left.hash + right.hash;
      const parentHash = createHash('sha256').update(combined).digest('hex');
      
      newLevel.push({
        hash: parentHash,
        left,
        right
      });
    }
    
    nodes.splice(0, nodes.length, ...newLevel);
  }
  
  return nodes[0];
}

/**
 * Generate Merkle proof for a specific action
 */
function generateMerkleProof(tree: MerkleNode, targetHash: string): string[] {
  const proof: string[] = [];
  
  function findPath(node: MerkleNode, target: string, path: string[]): boolean {
    if (node.hash === target) return true;
    if (!node.left && !node.right) return false;
    
    if (node.left && findPath(node.left, target, path)) {
      if (node.right) proof.push(node.right.hash);
      return true;
    }
    
    if (node.right && findPath(node.right, target, path)) {
      if (node.left) proof.push(node.left.hash);
      return true;
    }
    
    return false;
  }
  
  findPath(tree, targetHash, []);
  return proof;
}

/**
 * Main function to anchor log roots for a specific day
 */
export async function anchorLogRoot(day?: number): Promise<void> {
  try {
    // If no day specified, use yesterday
    const targetDate = day ? new Date(day.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) : 
      new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const utcDay = dateToUTCDay(targetDate);
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    console.log(`Anchoring log root for UTC day: ${utcDay} (${startOfDay.toISOString()} to ${endOfDay.toISOString()})`);
    
    // Fetch all admin actions for the day
    const actions = await prisma.adminAction.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    if (actions.length === 0) {
      console.log(`No admin actions found for day ${utcDay}`);
      return;
    }
    
    console.log(`Found ${actions.length} admin actions for day ${utcDay}`);
    
    // Hash each action
    const actionHashes = actions.map(hashAdminAction);
    
    // Build Merkle tree
    const merkleTree = buildMerkleTree(actionHashes);
    if (!merkleTree) {
      throw new Error('Failed to build Merkle tree');
    }
    
    const root = merkleTree.hash;
    console.log(`Computed Merkle root: ${root}`);
    
    // TODO: Commit to LogAnchor contract
    // This would require:
    // 1. Contract ABI and address
    // 2. Signer with appropriate permissions
    // 3. Gas estimation and transaction submission
    
    // For now, store the root locally
    // In production, you'd want a separate table for this
    console.log(`Root ${root} ready for on-chain commitment`);
    
    // Generate sample proof for first action
    if (actions.length > 0) {
      const firstActionHash = actionHashes[0];
      const proof = generateMerkleProof(merkleTree, firstActionHash);
      console.log(`Sample proof for action ${actions[0].id}:`, proof);
    }
    
  } catch (error) {
    console.error('Error anchoring log root:', error);
    throw error;
  }
}

/**
 * Verify a Merkle proof for a specific action
 */
export function verifyMerkleProof(
  actionHash: string,
  proof: string[],
  root: string
): boolean {
  let currentHash = actionHash;
  
  for (const proofElement of proof) {
    // Determine if proof element is left or right sibling
    // This is a simplified approach - in production you'd want to include
    // position information in the proof
    const combined = currentHash + proofElement;
    currentHash = createHash('sha256').update(combined).digest('hex');
  }
  
  return currentHash === root;
}

/**
 * CLI entry point for manual execution
 */
if (require.main === module) {
  const day = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  
  anchorLogRoot(day)
    .then(() => {
      console.log('Log root anchoring completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Log root anchoring failed:', error);
      process.exit(1);
    });
}
