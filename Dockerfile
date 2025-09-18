FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    nodejs \
    npm \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash
RUN /root/.foundry/bin/foundryup
ENV PATH="/root/.foundry/bin:${PATH}"

# Install PNPM
RUN npm i -g corepack && corepack enable

# Set working directory
WORKDIR /workspace

# Copy project files
COPY . .

# Install Foundry dependencies
RUN forge install

# Install Node.js dependencies (if they exist)
RUN if [ -f "package.json" ]; then pnpm install --frozen-lockfile; fi

# Expose ports for development
EXPOSE 3000 8545

# Default command
CMD ["/bin/bash"]
