"""
FastAPI Server for Kinsutra Family Relationship Engine
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any

from app.relationships.graph import RelationshipGraph, Person, EdgeType
from app.relationships.engine import get_relationship
from app.relationships.terminology import get_regional_term

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

class EdgeModel(BaseModel):
    from_id: str
    to_id: str
    type: str

class RelationshipRequest(BaseModel):
    people: List[PersonModel]
    edges: List[EdgeModel]
    me_id: str
    target_id: str
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
        elif e_type in ("SPOUSE", "MARRIED_TO"):
            graph.add_marriage(e.from_id, e.to_id)

    res = get_relationship(graph, req.me_id, req.target_id)
    canonical = res.get("relationship", "UNKNOWN")
    target_person = graph.people.get(req.target_id)
    target_gender = target_person.gender if target_person else "unknown"

    regional = get_regional_term(canonical, target_gender, req.language or "hindi")
    res["regional_term"] = regional

    return res
