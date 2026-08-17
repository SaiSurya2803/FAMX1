"""
Canonical Relationship Definitions & Enums
Research-backed Indian & Global Kinship System Enums
"""

from enum import Enum

class CanonicalRelationship(str, Enum):
    SELF = "SELF"

    # Direct Nuclear
    FATHER = "FATHER"
    MOTHER = "MOTHER"
    SON = "SON"
    DAUGHTER = "DAUGHTER"
    CHILD = "CHILD"
    HUSBAND = "HUSBAND"
    WIFE = "WIFE"
    SPOUSE = "SPOUSE"
    BROTHER = "BROTHER"
    SISTER = "SISTER"
    SIBLING = "SIBLING"

    # Grandparents
    PATERNAL_GRANDFATHER = "PATERNAL_GRANDFATHER"
    PATERNAL_GRANDMOTHER = "PATERNAL_GRANDMOTHER"
    MATERNAL_GRANDFATHER = "MATERNAL_GRANDFATHER"
    MATERNAL_GRANDMOTHER = "MATERNAL_GRANDMOTHER"

    # Grandchildren
    GRANDSON = "GRANDSON"
    GRANDDAUGHTER = "GRANDDAUGHTER"
    GRANDCHILD = "GRANDCHILD"

    # Uncles & Aunts
    PATERNAL_UNCLE = "PATERNAL_UNCLE"               # Father's brother (Chacha / Kaka / Babai)
    PATERNAL_AUNT = "PATERNAL_AUNT"                 # Father's sister (Bua / Atta)
    PATERNAL_UNCLE_SPOUSE = "PATERNAL_UNCLE_SPOUSE" # Chachi / Kaki
    PATERNAL_AUNT_SPOUSE = "PATERNAL_AUNT_SPOUSE"   # Fufa / Phupa

    MATERNAL_UNCLE = "MATERNAL_UNCLE"               # Mother's brother (Mama / Māmā)
    MATERNAL_AUNT = "MATERNAL_AUNT"                 # Mother's sister (Masi / Pinni)
    MATERNAL_UNCLE_SPOUSE = "MATERNAL_UNCLE_SPOUSE" # Mami
    MATERNAL_AUNT_SPOUSE = "MATERNAL_AUNT_SPOUSE"   # Mausa

    # Nephews & Nieces
    NEPHEW = "NEPHEW"                               # Brother's or Sister's son
    NIECE = "NIECE"                                 # Brother's or Sister's daughter

    # Cousins (Parallel vs Cross-Cousin anthropological distinction)
    PATERNAL_COUSIN = "PATERNAL_COUSIN"
    MATERNAL_COUSIN = "MATERNAL_COUSIN"
    PARALLEL_COUSIN = "PARALLEL_COUSIN"             # Same-sex sibling's child (Parallel Cousin)
    CROSS_COUSIN = "CROSS_COUSIN"                   # Opposite-sex sibling's child (Menarikam Cousin)
    COUSIN = "COUSIN"
    NEXT_GEN_COUSIN = "NEXT_GEN_COUSIN"

    # In-Laws & Affines
    FATHER_IN_LAW = "FATHER_IN_LAW"
    MOTHER_IN_LAW = "MOTHER_IN_LAW"
    BROTHER_IN_LAW = "BROTHER_IN_LAW"
    SISTER_IN_LAW = "SISTER_IN_LAW"
    SON_IN_LAW = "SON_IN_LAW"
    DAUGHTER_IN_LAW = "DAUGHTER_IN_LAW"
    CO_BROTHER = "CO_BROTHER"                       # Wife's sister's husband (Sadhakudu / Sadu)
    CO_SISTER = "CO_SISTER"                         # Husband's brother's wife (Devrani / Jethani)

    # Extended Marriage Boundaries
    SPOUSE_PATERNAL_UNCLE = "SPOUSE_PATERNAL_UNCLE"
    SPOUSE_MATERNAL_UNCLE = "SPOUSE_MATERNAL_UNCLE"
    SPOUSE_PATERNAL_AUNT = "SPOUSE_PATERNAL_AUNT"
    SPOUSE_MATERNAL_AUNT = "SPOUSE_MATERNAL_AUNT"

    # Multi-generation
    GREAT_GRANDFATHER = "GREAT_GRANDFATHER"
    GREAT_GRANDMOTHER = "GREAT_GRANDMOTHER"
    GREAT_GRANDCHILD = "GREAT_GRANDCHILD"

    UNKNOWN = "UNKNOWN"

class Side(str, Enum):
    PATERNAL = "PATERNAL"
    MATERNAL = "MATERNAL"
    IN_LAW = "IN_LAW"
    NUCLEAR = "NUCLEAR"
    NEUTRAL = "NEUTRAL"

class PathType(str, Enum):
    BLOOD = "BLOOD"
    MARRIAGE = "MARRIAGE"
    MIXED = "MIXED"
