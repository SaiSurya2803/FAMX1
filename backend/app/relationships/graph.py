"""
Graph Data Model for Kinsutra Family Engine
Stores fundamental facts:
- Nodes: Person (id, name, gender)
- Edges: PARENT_OF (parent_id -> child_id), MARRIED_TO (person1_id <-> person2_id)
"""

from typing import Dict, List, Optional, Set, Tuple

class Person:
    def __init__(self, id: str, name: str, gender: str = "unknown"):
        self.id = id
        self.name = name
        self.gender = gender.lower() if gender else "unknown"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "gender": self.gender
        }

class EdgeType:
    PARENT_OF = "PARENT_OF"
    MARRIED_TO = "MARRIED_TO"
    ADOPTIVE_PARENT_OF = "ADOPTIVE_PARENT_OF"
    STEP_PARENT_OF = "STEP_PARENT_OF"
    SIBLING_OF = "SIBLING_OF"

class RelationshipGraph:
    def __init__(self):
        self.people: Dict[str, Person] = {}
        # adjacency: person_id -> list of (target_id, relationship_type, direction)
        # direction: 'OUT' (from -> to), 'IN' (to -> from), 'UNDIRECTED'
        self.adj: Dict[str, List[Tuple[str, str, str]]] = {}

    def add_person(self, person: Person) -> None:
        self.people[person.id] = person
        if person.id not in self.adj:
            self.adj[person.id] = []

    def add_parent_child(self, parent_id: str, child_id: str, edge_type: str = EdgeType.PARENT_OF) -> None:
        if parent_id not in self.people:
            self.add_person(Person(id=parent_id, name=parent_id))
        if child_id not in self.people:
            self.add_person(Person(id=child_id, name=child_id))

        self.adj[parent_id].append((child_id, edge_type, "OUT"))
        self.adj[child_id].append((parent_id, edge_type, "IN"))

    def add_marriage(self, spouse1_id: str, spouse2_id: str) -> None:
        if spouse1_id not in self.people:
            self.add_person(Person(id=spouse1_id, name=spouse1_id))
        if spouse2_id not in self.people:
            self.add_person(Person(id=spouse2_id, name=spouse2_id))

        self.adj[spouse1_id].append((spouse2_id, EdgeType.MARRIED_TO, "UNDIRECTED"))
        self.adj[spouse2_id].append((spouse1_id, EdgeType.MARRIED_TO, "UNDIRECTED"))

    def add_sibling(self, person1_id: str, person2_id: str) -> None:
        if person1_id not in self.people:
            self.add_person(Person(id=person1_id, name=person1_id))
        if person2_id not in self.people:
            self.add_person(Person(id=person2_id, name=person2_id))

        self.adj[person1_id].append((person2_id, EdgeType.SIBLING_OF, "UNDIRECTED"))
        self.adj[person2_id].append((person1_id, EdgeType.SIBLING_OF, "UNDIRECTED"))

    def get_parents(self, person_id: str) -> List[str]:
        if person_id not in self.adj:
            return []
        return [target for target, rel, dir in self.adj[person_id] if rel in (EdgeType.PARENT_OF, EdgeType.ADOPTIVE_PARENT_OF, EdgeType.STEP_PARENT_OF) and dir == "IN"]

    def get_children(self, person_id: str) -> List[str]:
        if person_id not in self.adj:
            return []
        return [target for target, rel, dir in self.adj[person_id] if rel in (EdgeType.PARENT_OF, EdgeType.ADOPTIVE_PARENT_OF, EdgeType.STEP_PARENT_OF) and dir == "OUT"]

    def get_spouses(self, person_id: str) -> List[str]:
        if person_id not in self.adj:
            return []
        return [target for target, rel, dir in self.adj[person_id] if rel == EdgeType.MARRIED_TO]

    def get_siblings(self, person_id: str) -> List[str]:
        siblings = set()
        if person_id in self.adj:
            for target, rel, _ in self.adj[person_id]:
                if rel == EdgeType.SIBLING_OF:
                    siblings.add(target)
        parents = self.get_parents(person_id)
        if parents:
            for p in parents:
                for c in self.get_children(p):
                    if c != person_id:
                        siblings.add(c)
        return list(siblings)
