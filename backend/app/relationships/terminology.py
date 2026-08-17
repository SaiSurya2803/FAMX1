"""
Regional & Indian Cultural Terminology Mapping
Translates Canonical Relationships into Indian Kinship terms (Hindi, Telugu, Tamil, Kannada, Malayalam, Generic Indian).
"""

from typing import Dict, Any
from .canonical import CanonicalRelationship

INDIAN_TERMINOLOGY_MAP: Dict[str, Dict[str, str]] = {
    CanonicalRelationship.FATHER.value: {
        "hindi": "Pitaji / Papa",
        "telugu": "Nanna / Mavayya",
        "tamil": "Appa",
        "kannada": "Appa",
        "malayalam": "Appan / Achan",
        "generic": "Father (Pitaji / Appa)"
    },
    CanonicalRelationship.MOTHER.value: {
        "hindi": "Mataji / Maa",
        "telugu": "Amma",
        "tamil": "Amma",
        "kannada": "Amma",
        "malayalam": "Amma",
        "generic": "Mother (Amma / Mataji)"
    },
    CanonicalRelationship.PATERNAL_GRANDFATHER.value: {
        "hindi": "Dada",
        "telugu": "Thatha",
        "tamil": "Thatha",
        "kannada": "Ajja",
        "malayalam": "Muthassan",
        "generic": "Paternal Grandfather (Dada / Thatha)"
    },
    CanonicalRelationship.PATERNAL_GRANDMOTHER.value: {
        "hindi": "Dadi",
        "telugu": "Paati / Ammamma",
        "tamil": "Paati",
        "kannada": "Ajji",
        "malayalam": "Muthassi",
        "generic": "Paternal Grandmother (Dadi / Paati)"
    },
    CanonicalRelationship.MATERNAL_GRANDFATHER.value: {
        "hindi": "Nana",
        "telugu": "Thatha / Ammavan",
        "tamil": "Thatha",
        "kannada": "Ajja",
        "malayalam": "Muthassan",
        "generic": "Maternal Grandfather (Nana / Ammavan)"
    },
    CanonicalRelationship.MATERNAL_GRANDMOTHER.value: {
        "hindi": "Nani",
        "telugu": "Ammamma",
        "tamil": "Paati",
        "kannada": "Ajji",
        "malayalam": "Muthassi",
        "generic": "Maternal Grandmother (Nani / Ammamma)"
    },
    CanonicalRelationship.GREAT_GRANDFATHER.value: {
        "hindi": "Pardada",
        "telugu": "Muttajja",
        "tamil": "Kolluthatha",
        "kannada": "Muttajja",
        "malayalam": "Muthappan / Valiyammavan",
        "generic": "Great-Grandfather (Pardada / Muttajja)"
    },
    CanonicalRelationship.GREAT_GRANDMOTHER.value: {
        "hindi": "Pardadi",
        "telugu": "Muttajji",
        "tamil": "Kollupaati",
        "kannada": "Muttajji",
        "malayalam": "Valiyammassi",
        "generic": "Great-Grandmother (Pardadi / Muttajji)"
    },
    CanonicalRelationship.PATERNAL_UNCLE.value: {
        "hindi": "Chacha (Elder: Tau)",
        "telugu": "Babai (Elder: Peddananna)",
        "tamil": "Chithappa (Elder: Periappa)",
        "kannada": "Chikkappa (Elder: Doddappa)",
        "malayalam": "Elayappan (Elder: Valiyappan)",
        "generic": "Paternal Uncle (Chacha / Kaka / Babai)"
    },
    CanonicalRelationship.PATERNAL_AUNT.value: {
        "hindi": "Bua",
        "telugu": "Atta / Menatta",
        "tamil": "Attai",
        "kannada": "Atte",
        "malayalam": "Ammayi",
        "generic": "Paternal Aunt (Bua / Atta)"
    },
    CanonicalRelationship.MATERNAL_UNCLE.value: {
        "hindi": "Mama",
        "telugu": "Māmā",
        "tamil": "Thai Mama",
        "kannada": "Mava",
        "malayalam": "Ammavan",
        "generic": "Maternal Uncle (Mama / Māmā)"
    },
    CanonicalRelationship.MATERNAL_AUNT.value: {
        "hindi": "Masi",
        "telugu": "Pinni (Elder: Peddamma)",
        "tamil": "Chithi (Elder: Periamma)",
        "kannada": "Chikkamma (Elder: Doddamma)",
        "malayalam": "Ilayamma (Elder: Valiyamma)",
        "generic": "Maternal Aunt (Masi / Chithi / Pinni)"
    },
    CanonicalRelationship.PATERNAL_UNCLE_SPOUSE.value: {
        "hindi": "Chachi (Elder: Tai)",
        "telugu": "Pinni (Elder: Peddamma)",
        "tamil": "Chithi",
        "kannada": "Chikkamma",
        "malayalam": "Ilayamma",
        "generic": "Paternal Uncle's Wife (Chachi / Kaki)"
    },
    CanonicalRelationship.PATERNAL_AUNT_SPOUSE.value: {
        "hindi": "Fufa / Phupa",
        "telugu": "Mavayya",
        "tamil": "Mama",
        "kannada": "Mava",
        "malayalam": "Ammavan",
        "generic": "Paternal Aunt's Husband (Fufa / Mavayya)"
    },
    CanonicalRelationship.MATERNAL_UNCLE_SPOUSE.value: {
        "hindi": "Mami",
        "telugu": "Atta",
        "tamil": "Attai",
        "kannada": "Atte",
        "malayalam": "Ammayi",
        "generic": "Maternal Uncle's Wife (Mami)"
    },
    CanonicalRelationship.MATERNAL_AUNT_SPOUSE.value: {
        "hindi": "Mausa",
        "telugu": "Babai / Peddananna",
        "tamil": "Chithappa",
        "kannada": "Chikkappa",
        "malayalam": "Elayappan",
        "generic": "Maternal Aunt's Husband (Mausa)"
    },
    CanonicalRelationship.PATERNAL_COUSIN.value: {
        "hindi": "Chachera Bhai / Behen",
        "telugu": "Cousin (Baava / Bavamardhi / Vadina)",
        "tamil": "Machan / Machini",
        "kannada": "Cousin (Bava / Bavamaida)",
        "malayalam": "Cousin (Aliyan / Murapennu)",
        "generic": "Paternal Cousin"
    },
    CanonicalRelationship.MATERNAL_COUSIN.value: {
        "hindi": "Mamera Bhai / Behen",
        "telugu": "Cousin (Baava / Bavamardhi / Vadina)",
        "tamil": "Machan / Machini",
        "kannada": "Cousin (Bava / Bavamaida)",
        "malayalam": "Cousin (Aliyan / Murapennu)",
        "generic": "Maternal Cousin"
    },
    CanonicalRelationship.PARALLEL_COUSIN.value: {
        "hindi": "Bhai / Behen (Parallel Cousin)",
        "telugu": "Annayya / Chelli (Parallel Cousin)",
        "tamil": "Annan / Thangai (Parallel Cousin)",
        "kannada": "Anna / Thangi (Parallel Cousin)",
        "malayalam": "Jyeshthan / Aniyan (Parallel Cousin)",
        "generic": "Parallel Cousin (Sibling line)"
    },
    CanonicalRelationship.CROSS_COUSIN.value: {
        "hindi": "Cousin (Cross-cousin)",
        "telugu": "Menarikam Cousin (Bava / Vadina)",
        "tamil": "Machan / Machini (Cross-cousin)",
        "kannada": "Bava / Machida (Cross-cousin)",
        "malayalam": "Aliyan / Murapennu (Cross-cousin)",
        "generic": "Cross Cousin (Menarikam line)"
    },
    CanonicalRelationship.FATHER_IN_LAW.value: {
        "hindi": "Sasur",
        "telugu": "Mavayya",
        "tamil": "Maamanar",
        "kannada": "Mava",
        "malayalam": "Ammavan / Ammayan",
        "generic": "Father-in-law (Sasur / Mavayya)"
    },
    CanonicalRelationship.MOTHER_IN_LAW.value: {
        "hindi": "Sasu",
        "telugu": "Athamma",
        "tamil": "Maamiyaar",
        "kannada": "Atte",
        "malayalam": "Ammayi",
        "generic": "Mother-in-law (Sasu / Athamma)"
    },
    CanonicalRelationship.BROTHER_IN_LAW.value: {
        "hindi": "Jija / Saala / Devar / Jeth",
        "telugu": "Bava / Bavamardhi / Co-brother",
        "tamil": "Machan / Kolundhanar",
        "kannada": "Bava / Bavamaida",
        "malayalam": "Aliyan / Machunan",
        "generic": "Brother-in-law (Bava / Jija / Co-brother)"
    },
    CanonicalRelationship.SISTER_IN_LAW.value: {
        "hindi": "Bhabhi / Saali / Nanad",
        "telugu": "Vadinni / Maradalu",
        "tamil": "Anni / Kozhundhi",
        "kannada": "Nathini / Vadina",
        "malayalam": "Naathanon / Naathoon",
        "generic": "Sister-in-law (Bhabhi / Vadinni)"
    },
    CanonicalRelationship.CO_BROTHER.value: {
        "hindi": "Saandhi",
        "telugu": "Sadhakudu / Sadu",
        "tamil": "Sagalai",
        "kannada": "Saddu",
        "malayalam": "Sagalan",
        "generic": "Co-brother (Sadhakudu / Sadu)"
    },
    CanonicalRelationship.CO_SISTER.value: {
        "hindi": "Devrani / Jethani",
        "telugu": "Devrani / Jethani",
        "tamil": "Orapadi",
        "kannada": "Orapadi",
        "malayalam": "Orapadi",
        "generic": "Co-sister (Devrani / Jethani)"
    },
    CanonicalRelationship.SON_IN_LAW.value: {
        "hindi": "Damad",
        "telugu": "Alludu",
        "tamil": "Mappillai",
        "kannada": "Alluda",
        "malayalam": "Marumakan",
        "generic": "Son-in-law (Damad / Alludu)"
    },
    CanonicalRelationship.DAUGHTER_IN_LAW.value: {
        "hindi": "Bahu",
        "telugu": "Kodalu",
        "tamil": "Maattupenn",
        "kannada": "Sose",
        "malayalam": "Marumakal",
        "generic": "Daughter-in-law (Bahu / Kodalu)"
    },
}

def translate_relationship(canonical_result: Dict[str, Any], lang: str = "generic") -> Dict[str, Any]:
    """
    Enhances the canonical result with Indian regional terminology display names.
    """
    rel = canonical_result.get("relationship", "")
    terms = INDIAN_TERMINOLOGY_MAP.get(rel, {})
    regional_term = terms.get(lang.lower(), terms.get("generic", canonical_result.get("display_name")))

    res = dict(canonical_result)
    res["cultural_term"] = regional_term
    return res
