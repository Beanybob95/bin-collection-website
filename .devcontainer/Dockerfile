FROM node:20-bookworm

# Optional but useful for some npm packages and general dev tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
  git \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace