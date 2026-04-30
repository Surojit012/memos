"""
memoryos.types
~~~~~~~~~~~~~~

Type definitions for the MemoryOS Python SDK.
Mirrors the TypeScript types in lib/types.ts.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional


MemoryType = Literal["episodic", "semantic", "procedural"]


@dataclass
class Memory:
    """A single memory record stored on 0G Storage."""
    id: str
    agent_id: str
    type: MemoryType
    content: str
    tags: List[str] = field(default_factory=list)
    importance: int = 3
    created_at: int = 0
    updated_at: int = 0
    access_count: int = 0
    storage_hash: Optional[str] = None
    embedding: Optional[List[float]] = None
    embedding_model: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None

    @classmethod
    def from_dict(cls, data: dict) -> "Memory":
        return cls(
            id=data.get("id", ""),
            agent_id=data.get("agentId", ""),
            type=data.get("type", "semantic"),
            content=data.get("content", ""),
            tags=data.get("tags", []),
            importance=data.get("importance", 3),
            created_at=data.get("createdAt", 0),
            updated_at=data.get("updatedAt", 0),
            access_count=data.get("accessCount", 0),
            storage_hash=data.get("storageHash"),
            embedding=data.get("embedding"),
            embedding_model=data.get("embeddingModel"),
            metadata=data.get("metadata"),
        )


@dataclass
class Skill:
    """A skill published to the MemoryOS marketplace."""
    id: str
    name: str
    description: str
    category: str
    prompt: str
    input_label: str = ""
    output_label: str = ""
    price: str = "0"
    publisher_address: str = ""
    publisher_name: str = ""
    publisher_agent_id: str = ""
    created_at: int = 0
    usage_count: int = 0
    total_earned: float = 0.0
    tags: List[str] = field(default_factory=list)
    storage_hash: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict) -> "Skill":
        return cls(
            id=data.get("id", ""),
            name=data.get("name", ""),
            description=data.get("description", ""),
            category=data.get("category", ""),
            prompt=data.get("prompt", ""),
            input_label=data.get("inputLabel", ""),
            output_label=data.get("outputLabel", ""),
            price=data.get("price", "0"),
            publisher_address=data.get("publisherAddress", ""),
            publisher_name=data.get("publisherName", ""),
            publisher_agent_id=data.get("publisherAgentId", ""),
            created_at=data.get("createdAt", 0),
            usage_count=data.get("usageCount", 0),
            total_earned=data.get("totalEarned", 0.0),
            tags=data.get("tags", []),
            storage_hash=data.get("storageHash"),
        )


@dataclass
class AgentIdentity:
    """An agent identity anchored on 0G."""
    agent_id: str
    name: str
    created_at: int = 0
    memory_count: int = 0
    skills_published: int = 0
    total_reads: int = 0
    total_earned: float = 0.0
    storage_used: int = 0
    openclaw_connected: bool = False
    identity_hash: Optional[str] = None
    owner_address: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict) -> "AgentIdentity":
        return cls(
            agent_id=data.get("agentId", ""),
            name=data.get("name", ""),
            created_at=data.get("createdAt", 0),
            memory_count=data.get("memoryCount", 0),
            skills_published=data.get("skillsPublished", 0),
            total_reads=data.get("totalReads", 0),
            total_earned=data.get("totalEarned", 0.0),
            storage_used=data.get("storageUsed", 0),
            openclaw_connected=data.get("openClawConnected", False),
            identity_hash=data.get("identityHash"),
            owner_address=data.get("ownerAddress"),
        )


@dataclass
class MemorySaveOptions:
    """Options for saving a memory."""
    type: MemoryType = "semantic"
    tags: List[str] = field(default_factory=list)
    importance: int = 3
    metadata: Optional[Dict[str, str]] = None


@dataclass
class SkillPublishInput:
    """Input for publishing a skill."""
    name: str
    description: str
    prompt: str
    price: str
    publisher_name: str
    category: str = "general"
    input_label: str = ""
    output_label: str = ""
    publisher_address: str = ""
    publisher_agent_id: str = ""
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "prompt": self.prompt,
            "price": self.price,
            "publisherName": self.publisher_name,
            "category": self.category,
            "inputLabel": self.input_label,
            "outputLabel": self.output_label,
            "publisherAddress": self.publisher_address,
            "publisherAgentId": self.publisher_agent_id,
            "tags": self.tags,
        }
