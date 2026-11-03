"""
FastAPI Server for Kinsutra Family Relationship Engine
"""

import sys
import os
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, AliasChoices

# Ensure backend and root paths are available in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
ROOT_DIR = os.path.dirname(BACKEND_DIR)

for path in [BACKEND_DIR, ROOT_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    from app.relationships.graph import RelationshipGraph, Person, EdgeType
    from app.relationships.engine import get_relationship
    from app.relationships.terminology import get_regional_term
except ImportError:
    from backend.app.relationships.graph import RelationshipGraph, Person, EdgeType
    from backend.app.relationships.engine import get_relationship
    from backend.app.relationships.terminology import get_regional_term

app = FastAPI(title="Kinsutra Kinship Engine API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PersonModel(BaseModel):
    id: str
    name: str
    gender: Optional[str] = "unknown"
    birthDate: Optional[str] = None
    birthPlace: Optional[str] = None
    isDeceased: Optional[bool] = False
    phone: Optional[str] = None
    whatsapp: Optional[str] = None

class EdgeModel(BaseModel):
    from_id: str = Field(validation_alias=AliasChoices("from_id", "from"))
    to_id: str = Field(validation_alias=AliasChoices("to_id", "to"))
    type: str

class RelationshipRequest(BaseModel):
    people: List[PersonModel]
    edges: List[EdgeModel]
    me_id: str = Field(validation_alias=AliasChoices("me_id", "meId"))
    target_id: str = Field(validation_alias=AliasChoices("target_id", "targetId"))
    language: Optional[str] = "hindi"

@app.get("/health")
def health_check():
    return {"status": "healthy", "engine": "Lounsbury Kinship Algebra 2.0"}

@app.post("/api/relationship")
def calculate_relationship(req: RelationshipRequest):
    graph = RelationshipGraph()

    for p in req.people:
        graph.add_person(Person(id=p.id, name=p.name, gender=p.gender or "unknown"))

    for e in req.edges:
        e_type = e.type.upper()
        if e_type in ("PARENT", "PARENT_OF"):
            graph.add_parent_child(e.from_id, e.to_id)
        elif e_type in ("CHILD", "CHILD_OF"):
            graph.add_parent_child(e.to_id, e.from_id)
        elif e_type in ("SPOUSE", "MARRIED_TO"):
            graph.add_marriage(e.from_id, e.to_id)
        elif e_type in ("SIBLING", "SIBLING_OF", "HALF_SIBLING"):
            graph.add_sibling(e.from_id, e.to_id)

    res = get_relationship(graph, req.me_id, req.target_id)
    canonical = res.get("relationship", "UNKNOWN")
    target_person = graph.people.get(req.target_id)
    target_gender = target_person.gender if target_person else "unknown"

    regional = get_regional_term(canonical, target_gender, req.language or "hindi")
    res["regional_term"] = regional

    return res
