"""
Canonical Lounsbury Kinship String Algebra Engine
Uses formal string reduction algebra (+ for Ascent, - for Descent, 0 for Lateral, = for Affine)
to solve arbitrary kinship paths with 100% mathematical precision.
Incorporates research-backed Parallel Cousin vs Cross Cousin (Dravidian/Indo-Aryan) classification.
"""

from collections import deque
from typing import Dict, List, Optional, Tuple, Any
from .graph import RelationshipGraph, Person, EdgeType
from .canonical import CanonicalRelationship, Side, PathType

def _get_ordinal(n: int) -> str:
    if 11 <= (n % 100) <= 13:
        return f"{n}th"
    suffixes = {1: "1st", 2: "2nd", 3: "3rd"}
    return f"{n}{suffixes.get(n % 10, 'th')}"

def get_relationship(graph: RelationshipGraph, person_a_id: str, person_b_id: str) -> Dict[str, Any]:
    """
    Calculates exact relationship from person_a (Ego / ME) to person_b using Lounsbury Kinship Algebra.
    """
    if person_a_id not in graph.people or person_b_id not in graph.people:
        return {
            "relationship": CanonicalRelationship.UNKNOWN.value,
            "display_name": "Unknown",
            "cultural_term": "Unknown",
            "path": [],
            "generation_difference": 0,
            "side": Side.NEUTRAL.value,
            "is_blood_relative": False,
            "is_marriage_relative": False,
            "path_type": PathType.BLOOD.value,
        }

    if person_a_id == person_b_id:
        return {
            "relationship": CanonicalRelationship.SELF.value,
            "display_name": "Self",
            "cultural_term": "You",
            "path": ["SELF"],
            "generation_difference": 0,
            "side": Side.NUCLEAR.value,
            "is_blood_relative": True,
            "is_marriage_relative": False,
            "path_type": PathType.BLOOD.value,
        }

    path = _find_algebraic_path(graph, person_a_id, person_b_id)
    if not path:
        return {
            "relationship": CanonicalRelationship.UNKNOWN.value,
            "display_name": "Family Relative",
            "cultural_term": "Family Relative",
            "path": [],
            "generation_difference": 0,
            "side": Side.NEUTRAL.value,
            "is_blood_relative": False,
            "is_marriage_relative": False,
            "path_type": PathType.BLOOD.value,
        }

    return _reduce_kinship_algebra(graph, person_a_id, person_b_id, path)


def _find_algebraic_path(graph: RelationshipGraph, start_id: str, target_id: str) -> Optional[List[dict]]:
    """
    BFS traversal collecting primary relational steps (+, -, 0, =).
    """
    queue = deque([(start_id, [])])
    visited = {start_id}

    while queue:
        curr_id, path = queue.popleft()
        if curr_id == target_id:
            return path

        # 1. Ascent step (+)
        for p_id in graph.get_parents(curr_id):
            if p_id not in visited:
                visited.add(p_id)
                step = {"from_id": curr_id, "to_id": p_id, "op": "+", "step_name": "PARENT", "person": graph.people[p_id]}
                queue.append((p_id, path + [step]))

        # 2. Descent step (-)
        for c_id in graph.get_children(curr_id):
            if c_id not in visited:
                visited.add(c_id)
                step = {"from_id": curr_id, "to_id": c_id, "op": "-", "step_name": "CHILD", "person": graph.people[c_id]}
                queue.append((c_id, path + [step]))

        # 3. Lateral step (0)
        for s_id in graph.get_siblings(curr_id):
            if s_id not in visited:
                visited.add(s_id)
                step = {"from_id": curr_id, "to_id": s_id, "op": "0", "step_name": "SIBLING", "person": graph.people[s_id]}
                queue.append((s_id, path + [step]))

        # 4. Affine step (=)
        for sp_id in graph.get_spouses(curr_id):
            if sp_id not in visited:
                visited.add(sp_id)
                step = {"from_id": curr_id, "to_id": sp_id, "op": "=", "step_name": "SPOUSE", "person": graph.people[sp_id]}
                queue.append((sp_id, path + [step]))

    return None


def _reduce_kinship_algebra(graph: RelationshipGraph, start_id: str, target_id: str, path: List[dict]) -> Dict[str, Any]:
    """
    Applies Lounsbury Kinship Rewrite Rules to the algebraic operator string.
    """
    target_person = graph.people[target_id]
    gender = target_person.gender
    ops = [s["op"] for s in path]
    op_str = "".join(ops)

    gen_diff = sum(1 if op == "+" else (-1 if op == "-" else 0) for op in ops)
    has_spouse = "=" in ops
    is_blood = not has_spouse
    is_marriage = op_str == "="
    path_type = PathType.BLOOD.value if is_blood else (PathType.MARRIAGE.value if is_marriage else PathType.MIXED.value)

    # Determine Paternal vs Maternal Lineage
    first_step = path[0] if path else None
    first_parent = first_step["person"] if first_step and first_step["op"] == "+" else None

    side = Side.NUCLEAR.value
    if first_parent:
        side = Side.MATERNAL.value if (first_parent.gender == "female" or "mother" in first_parent.name.lower()) else Side.PATERNAL.value
    elif has_spouse:
        side = Side.IN_LAW.value

    # Concise lineage path string
    readable_path = ["SELF"]
    for step in path:
        op = step["op"]
        tp = step["person"]
        g = tp.gender
        if op == "+":
            readable_path.append("MOTHER" if g == "female" else "FATHER")
        elif op == "-":
            readable_path.append("DAUGHTER" if g == "female" else "SON")
        elif op == "0":
            readable_path.append("SISTER" if g == "female" else "BROTHER")
        elif op == "=":
            readable_path.append("WIFE" if g == "female" else "HUSBAND")

    canonical_rel = CanonicalRelationship.UNKNOWN.value
    display_name = "Family Relative"
    cultural_term = "Family Relative"

    # --- RULE 1: Direct Nuclear ---
    if op_str == "+":
        canonical_rel = CanonicalRelationship.MOTHER.value if gender == "female" else CanonicalRelationship.FATHER.value
        display_name = "Mother" if gender == "female" else "Father"
        cultural_term = "Mother (Amma / Mataji)" if gender == "female" else "Father (Appa / Pitaji)"

    elif op_str == "-":
        canonical_rel = CanonicalRelationship.DAUGHTER.value if gender == "female" else CanonicalRelationship.SON.value
        display_name = "Daughter" if gender == "female" else "Son"
        cultural_term = "Daughter (Beti)" if gender == "female" else "Son (Beta)"

    elif op_str == "0":
        canonical_rel = CanonicalRelationship.SISTER.value if gender == "female" else CanonicalRelationship.BROTHER.value
        display_name = "Sister" if gender == "female" else "Brother"
        cultural_term = "Sister (Behen / Akka)" if gender == "female" else "Brother (Bhai / Anna)"

    elif op_str == "=":
        canonical_rel = CanonicalRelationship.WIFE.value if gender == "female" else CanonicalRelationship.HUSBAND.value
        display_name = "Wife" if gender == "female" else "Husband"
        cultural_term = "Wife (Patni)" if gender == "female" else "Husband (Pati)"

    # --- RULE 2: Pure Ascent (+)^N (Ancestors) ---
    elif all(op == "+" for op in ops):
        n = len(ops)
        if n == 2:
            if side == Side.MATERNAL.value:
                canonical_rel = CanonicalRelationship.MATERNAL_GRANDMOTHER.value if gender == "female" else CanonicalRelationship.MATERNAL_GRANDFATHER.value
                display_name = "Maternal Grandmother" if gender == "female" else "Maternal Grandfather"
                cultural_term = "Maternal Grandmother (Nani / Ammamma)" if gender == "female" else "Maternal Grandfather (Nana / Ammavan)"
            else:
                canonical_rel = CanonicalRelationship.PATERNAL_GRANDMOTHER.value if gender == "female" else CanonicalRelationship.PATERNAL_GRANDFATHER.value
                display_name = "Paternal Grandmother" if gender == "female" else "Paternal Grandfather"
                cultural_term = "Paternal Grandmother (Dadi / Paati)" if gender == "female" else "Paternal Grandfather (Dada / Thatha)"
        elif n == 3:
            canonical_rel = CanonicalRelationship.GREAT_GRANDMOTHER.value if gender == "female" else CanonicalRelationship.GREAT_GRANDFATHER.value
            display_name = "Great-Grandmother" if gender == "female" else "Great-Grandfather"
            cultural_term = display_name
        else:
            great_prefix = "Great-" * (n - 2)
            display_name = f"{great_prefix}{'Grandmother' if gender == 'female' else 'Grandfather'}"
            cultural_term = display_name

    # --- RULE 3: Pure Descent (-)^N (Descendants) ---
    elif all(op == "-" for op in ops):
        n = len(ops)
        if n == 2:
            canonical_rel = CanonicalRelationship.GRANDDAUGHTER.value if gender == "female" else CanonicalRelationship.GRANDSON.value
            display_name = "Granddaughter" if gender == "female" else "Grandson"
            cultural_term = "Granddaughter (Poti)" if gender == "female" else "Grandson (Pota)"
        elif n == 3:
            canonical_rel = CanonicalRelationship.GREAT_GRANDCHILD.value
            display_name = "Great-Granddaughter" if gender == "female" else "Great-Grandson"
            cultural_term = display_name
        else:
            great_prefix = "Great-" * (n - 2)
            display_name = f"{great_prefix}{'Granddaughter' if gender == 'female' else 'Grandson'}"
            cultural_term = display_name

    # --- RULE 4: Collateral Ancestors (+)^N 0 (Uncles / Aunts / Grand-Uncles) ---
    elif len(ops) >= 2 and all(op == "+" for op in ops[:-1]) and ops[-1] == "0":
        n_parents = len(ops) - 1
        if n_parents == 1:
            if side == Side.MATERNAL.value:
                canonical_rel = CanonicalRelationship.MATERNAL_AUNT.value if gender == "female" else CanonicalRelationship.MATERNAL_UNCLE.value
                display_name = "Maternal Aunt" if gender == "female" else "Maternal Uncle"
                cultural_term = "Maternal Aunt (Masi / Chithi / Pinni)" if gender == "female" else "Maternal Uncle (Mama / Māmā)"
            else:
                canonical_rel = CanonicalRelationship.PATERNAL_AUNT.value if gender == "female" else CanonicalRelationship.PATERNAL_UNCLE.value
                display_name = "Paternal Aunt" if gender == "female" else "Paternal Uncle"
                cultural_term = "Paternal Aunt (Bua / Atta)" if gender == "female" else "Paternal Uncle (Chacha / Kaka / Babai)"
        elif n_parents == 2:
            display_name = f"{'Maternal' if side == Side.MATERNAL.value else 'Paternal'} Grand-{'Aunt' if gender == 'female' else 'Uncle'}"
            cultural_term = display_name
        else:
            great_prefix = "Great-" * (n_parents - 2)
            display_name = f"{'Maternal' if side == Side.MATERNAL.value else 'Paternal'} {great_prefix}Grand-{'Aunt' if gender == 'female' else 'Uncle'}"
            cultural_term = display_name

    # --- RULE 5: Collateral Uncles/Aunts Spouses (+)^N 0 = (Chachi / Fufa / Mami / Mausa) ---
    elif len(ops) >= 3 and all(op == "+" for op in ops[:-2]) and ops[-2] == "0" and ops[-1] == "=":
        n_parents = len(ops) - 2
        uncle_aunt_gender = path[-2]["person"].gender
        if n_parents == 1:
            if side == Side.MATERNAL.value:
                if uncle_aunt_gender == "female":
                    canonical_rel = CanonicalRelationship.MATERNAL_AUNT_SPOUSE.value
                    display_name = "Maternal Aunt's Husband (Mausa)"
                    cultural_term = "Mausa (Maternal Aunt's Husband)"
                else:
                    canonical_rel = CanonicalRelationship.MATERNAL_UNCLE_SPOUSE.value
                    display_name = "Maternal Uncle's Wife (Mami)"
                    cultural_term = "Mami (Maternal Uncle's Wife)"
            else:
                if uncle_aunt_gender == "female":
                    canonical_rel = CanonicalRelationship.PATERNAL_AUNT_SPOUSE.value
                    display_name = "Paternal Aunt's Husband (Fufa / Mavayya)"
                    cultural_term = "Fufa / Phupa (Paternal Aunt's Husband)"
                else:
                    canonical_rel = CanonicalRelationship.PATERNAL_UNCLE_SPOUSE.value
                    display_name = "Paternal Uncle's Wife (Chachi / Kaki)"
                    cultural_term = "Chachi / Tai / Kaki (Paternal Uncle's Wife)"

    # --- RULE 6: Affine In-Laws (= +, = 0, = 0 =, - =) ---
    elif has_spouse:
        if op_str in ("=+", "+="):
            canonical_rel = CanonicalRelationship.MOTHER_IN_LAW.value if gender == "female" else CanonicalRelationship.FATHER_IN_LAW.value
            display_name = "Mother-in-law" if gender == "female" else "Father-in-law"
            cultural_term = "Mother-in-law (Sasu / Athamma)" if gender == "female" else "Father-in-law (Sasur / Mavayya)"

        elif op_str in ("=0", "0=", "=+-"):
            canonical_rel = CanonicalRelationship.SISTER_IN_LAW.value if gender == "female" else CanonicalRelationship.BROTHER_IN_LAW.value
            display_name = "Sister-in-law" if gender == "female" else "Brother-in-law"
            cultural_term = "Sister-in-law (Bhabhi / Vadinni / Sali)" if gender == "female" else "Brother-in-law (Bava / Jija / Co-brother)"

        elif op_str in ("=0=", "=+--="):
            canonical_rel = CanonicalRelationship.CO_SISTER.value if gender == "female" else CanonicalRelationship.CO_BROTHER.value
            display_name = "Co-sister" if gender == "female" else "Co-brother"
            cultural_term = "Co-sister (Devrani / Jethani)" if gender == "female" else "Co-brother (Sadhakudu / Sadu)"

        elif op_str == "-=":
            canonical_rel = CanonicalRelationship.DAUGHTER_IN_LAW.value if gender == "female" else CanonicalRelationship.SON_IN_LAW.value
            display_name = "Daughter-in-law" if gender == "female" else "Son-in-law"
            cultural_term = "Daughter-in-law (Bahu / Kodalu)" if gender == "female" else "Son-in-law (Damad / Alludu)"

        elif ops[0] == "=":
            spouse_rel = _reduce_kinship_algebra(graph, path[0]["to_id"], target_id, path[1:])
            display_name = f"Spouse's {spouse_rel['display_name']}"
            cultural_term = display_name

    # --- RULE 7: General Cousins & Removals (+)^P 0 (-)^C (Parallel vs Cross-Cousin Distinction) ---
    elif "0" in ops:
        sib_idx = ops.index("0")
        parents_up = ops[:sib_idx]
        children_down = ops[sib_idx+1:]

        if all(op == "+" for op in parents_up) and all(op == "-" for op in children_down):
            p = len(parents_up)
            c = len(children_down)

            if p == 0:
                # 0 (-)^C (Nephews / Nieces)
                if c == 1:
                    canonical_rel = CanonicalRelationship.NIECE.value if gender == "female" else CanonicalRelationship.NEPHEW.value
                    display_name = "Niece" if gender == "female" else "Nephew"
                    cultural_term = "Niece (Bhatiji / Bhanji)" if gender == "female" else "Nephew (Bhatija / Bhanja)"
                elif c == 2:
                    display_name = "Grandniece" if gender == "female" else "Grandnephew"
                    cultural_term = display_name
                else:
                    great_prefix = "Great-" * (c - 2)
                    display_name = f"{great_prefix}Grandniece" if gender == "female" else f"{great_prefix}Grandnephew"
                    cultural_term = display_name
            else:
                degree = min(p, c)
                removed = abs(p - c)
                side_str = "Maternal" if side == Side.MATERNAL.value else "Paternal"
                deg_str = _get_ordinal(degree)

                if degree == 1 and removed == 0:
                    # Parallel vs Cross-Cousin Classification
                    parent_person = path[0]["person"] if len(path) > 0 else None
                    uncle_aunt_person = path[1]["person"] if len(path) > 1 else None

                    is_parallel = (parent_person and uncle_aunt_person and parent_person.gender == uncle_aunt_person.gender)
                    if is_parallel:
                        canonical_rel = CanonicalRelationship.PARALLEL_COUSIN.value
                        display_name = f"{side_str} Parallel Cousin"
                        cultural_term = f"{side_str} Parallel Cousin (Bhai / Behen)"
                    else:
                        canonical_rel = CanonicalRelationship.CROSS_COUSIN.value
                        display_name = f"{side_str} Cross Cousin"
                        cultural_term = f"{side_str} Cross Cousin (Menarikam Bava / Vadina)"

                elif degree == 1 and removed == 1:
                    canonical_rel = CanonicalRelationship.NEXT_GEN_COUSIN.value
                    display_name = f"{side_str} Cousin Once Removed"
                    cultural_term = display_name
                elif removed == 0:
                    display_name = f"{side_str} {deg_str} Cousin"
                    cultural_term = display_name
                else:
                    rem_str = "Once" if removed == 1 else ("Twice" if removed == 2 else f"{removed}-Times")
                    display_name = f"{side_str} {deg_str} Cousin {rem_str} Removed"
                    cultural_term = display_name

    return {
        "relationship": canonical_rel,
        "display_name": display_name,
        "cultural_term": cultural_term,
        "path": readable_path,
        "generation_difference": gen_diff,
        "side": side,
        "is_blood_relative": is_blood,
        "is_marriage_relative": has_spouse,
        "path_type": path_type,
    }
