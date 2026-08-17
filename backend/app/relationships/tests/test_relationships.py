"""
Automated Test Suite for Canonical Relationship Engine
Tests core scenarios, parallel vs cross cousins, regional Indian terminology, co-brothers, and complex multi-generational family graphs.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

import unittest
from backend.app.relationships.graph import RelationshipGraph, Person
from backend.app.relationships.canonical import CanonicalRelationship, Side, PathType
from backend.app.relationships.engine import get_relationship
from backend.app.relationships.terminology import translate_relationship

class TestRelationshipEngine(unittest.TestCase):

    def setUp(self):
        self.g = RelationshipGraph()

    def test_01_me_father(self):
        me = Person("me", "Bheema", "male")
        father = Person("father", "Kiran", "male")
        self.g.add_person(me)
        self.g.add_person(father)
        self.g.add_parent_child("father", "me")

        res = get_relationship(self.g, "me", "father")
        self.assertEqual(res["relationship"], CanonicalRelationship.FATHER.value)
        self.assertEqual(res["display_name"], "Father")

    def test_02_me_mother(self):
        me = Person("me", "Bheema", "male")
        mother = Person("mother", "Sujatha", "female")
        self.g.add_person(me)
        self.g.add_person(mother)
        self.g.add_parent_child("mother", "me")

        res = get_relationship(self.g, "me", "mother")
        self.assertEqual(res["relationship"], CanonicalRelationship.MOTHER.value)
        self.assertEqual(res["display_name"], "Mother")

    def test_03_paternal_grandfather(self):
        me = Person("me", "Bheema", "male")
        father = Person("father", "Kiran", "male")
        p_gfather = Person("p_gfather", "Rama Rao", "male")
        self.g.add_parent_child("father", "me")
        self.g.add_parent_child("p_gfather", "father")

        res = get_relationship(self.g, "me", "p_gfather")
        self.assertEqual(res["relationship"], CanonicalRelationship.PATERNAL_GRANDFATHER.value)
        self.assertEqual(res["side"], Side.PATERNAL.value)

    def test_04_maternal_grandfather(self):
        me = Person("me", "Bheema", "male")
        mother = Person("mother", "Sujatha", "female")
        m_gfather = Person("m_gfather", "Laxman Rao", "male")
        self.g.add_parent_child("mother", "me")
        self.g.add_parent_child("m_gfather", "mother")

        res = get_relationship(self.g, "me", "m_gfather")
        self.assertEqual(res["relationship"], CanonicalRelationship.MATERNAL_GRANDFATHER.value)
        self.assertEqual(res["side"], Side.MATERNAL.value)

    def test_05_paternal_uncle(self):
        me = Person("me", "Bheema", "male")
        father = Person("father", "Kiran", "male")
        uncle = Person("uncle", "Ravi", "male")
        gfather = Person("gfather", "Rama Rao", "male")

        self.g.add_parent_child("father", "me")
        self.g.add_parent_child("gfather", "father")
        self.g.add_parent_child("gfather", "uncle")

        res = get_relationship(self.g, "me", "uncle")
        self.assertEqual(res["relationship"], CanonicalRelationship.PATERNAL_UNCLE.value)
        self.assertEqual(res["side"], Side.PATERNAL.value)

    def test_06_maternal_aunt(self):
        me = Person("me", "Bheema", "male")
        mother = Person("mother", "Sujatha", "female")
        m_aunt = Person("m_aunt", "Lakshmi", "female")
        gfather = Person("gfather", "Laxman Rao", "male")

        self.g.add_person(me)
        self.g.add_person(mother)
        self.g.add_person(m_aunt)
        self.g.add_person(gfather)

        self.g.add_parent_child("mother", "me")
        self.g.add_parent_child("gfather", "mother")
        self.g.add_parent_child("gfather", "m_aunt")

        res = get_relationship(self.g, "me", "m_aunt")
        self.assertEqual(res["relationship"], CanonicalRelationship.MATERNAL_AUNT.value)
        self.assertEqual(res["side"], Side.MATERNAL.value)

    def test_07_paternal_parallel_cousin(self):
        me = Person("me", "Bheema", "male")
        father = Person("father", "Kiran", "male")
        uncle = Person("uncle", "Ravi", "male")
        cousin = Person("cousin", "Varun", "male")
        gfather = Person("gfather", "Rama Rao", "male")

        self.g.add_person(me)
        self.g.add_person(father)
        self.g.add_person(uncle)
        self.g.add_person(cousin)
        self.g.add_person(gfather)

        self.g.add_parent_child("father", "me")
        self.g.add_parent_child("gfather", "father")
        self.g.add_parent_child("gfather", "uncle")
        self.g.add_parent_child("uncle", "cousin")

        res = get_relationship(self.g, "me", "cousin")
        self.assertEqual(res["relationship"], CanonicalRelationship.PARALLEL_COUSIN.value)
        self.assertEqual(res["side"], Side.PATERNAL.value)

    def test_08_maternal_cross_cousin(self):
        me = Person("me", "Bheema", "male")
        mother = Person("mother", "Sujatha", "female")
        m_uncle = Person("m_uncle", "Srinivas", "male")
        cousin = Person("cousin", "Pooja", "female")
        gfather = Person("gfather", "Laxman Rao", "male")

        self.g.add_person(me)
        self.g.add_person(mother)
        self.g.add_person(m_uncle)
        self.g.add_person(cousin)
        self.g.add_person(gfather)

        self.g.add_parent_child("mother", "me")
        self.g.add_parent_child("gfather", "mother")
        self.g.add_parent_child("gfather", "m_uncle")
        self.g.add_parent_child("m_uncle", "cousin")

        res = get_relationship(self.g, "me", "cousin")
        self.assertEqual(res["relationship"], CanonicalRelationship.CROSS_COUSIN.value)
        self.assertEqual(res["side"], Side.MATERNAL.value)

    def test_09_father_in_law(self):
        me = Person("me", "Bheema", "male")
        spouse = Person("spouse", "Ananya", "female")
        fil = Person("fil", "Venkat", "male")

        self.g.add_person(me)
        self.g.add_person(spouse)
        self.g.add_person(fil)

        self.g.add_marriage("me", "spouse")
        self.g.add_parent_child("fil", "spouse")

        res = get_relationship(self.g, "me", "fil")
        self.assertEqual(res["relationship"], CanonicalRelationship.FATHER_IN_LAW.value)
        self.assertEqual(res["path_type"], PathType.MIXED.value)

    def test_10_brother_in_law(self):
        me = Person("me", "Bheema", "male")
        spouse = Person("spouse", "Ananya", "female")
        bil = Person("bil", "Karthik", "male")
        fil = Person("fil", "Venkat", "male")

        self.g.add_person(me)
        self.g.add_person(spouse)
        self.g.add_person(bil)
        self.g.add_person(fil)

        self.g.add_marriage("me", "spouse")
        self.g.add_parent_child("fil", "spouse")
        self.g.add_parent_child("fil", "bil")

        res = get_relationship(self.g, "me", "bil")
        self.assertEqual(res["relationship"], CanonicalRelationship.BROTHER_IN_LAW.value)

    def test_11_daughter_in_law(self):
        me = Person("me", "Bheema", "male")
        son = Person("son", "Aditya", "male")
        dil = Person("dil", "Kavya", "female")

        self.g.add_person(me)
        self.g.add_person(son)
        self.g.add_person(dil)

        self.g.add_parent_child("me", "son")
        self.g.add_marriage("son", "dil")

        res = get_relationship(self.g, "me", "dil")
        self.assertEqual(res["relationship"], CanonicalRelationship.DAUGHTER_IN_LAW.value)

    def test_12_next_gen_cousin(self):
        me = Person("me", "Bheema", "male")
        father = Person("father", "Kiran", "male")
        uncle = Person("uncle", "Ravi", "male")
        cousin = Person("cousin", "Varun", "male")
        c_child = Person("c_child", "Aarav", "male")
        gfather = Person("gfather", "Rama Rao", "male")

        self.g.add_parent_child("father", "me")
        self.g.add_parent_child("gfather", "father")
        self.g.add_parent_child("gfather", "uncle")
        self.g.add_parent_child("uncle", "cousin")
        self.g.add_parent_child("cousin", "c_child")

        res = get_relationship(self.g, "me", "c_child")
        self.assertEqual(res["relationship"], CanonicalRelationship.NEXT_GEN_COUSIN.value)

    def test_13_complex_indian_family_graph(self):
        ggf = Person("ggf", "Great Grandfather", "male")
        gf = Person("gf", "Grandfather", "male")
        guncle = Person("guncle", "Granduncle", "male")
        father = Person("father", "Father", "male")
        uncle = Person("uncle", "Uncle", "male")
        aunt = Person("aunt", "Aunt", "female")
        me = Person("me", "ME", "male")
        sister = Person("sister", "Sister", "female")
        spouse = Person("spouse", "Spouse", "female")
        child = Person("child", "Child", "male")

        s_father = Person("s_father", "Spouse Father", "male")
        s_mother = Person("s_mother", "Spouse Mother", "female")
        s_brother = Person("s_brother", "Spouse Brother", "male")

        for p in [ggf, gf, guncle, father, uncle, aunt, me, sister, spouse, child, s_father, s_mother, s_brother]:
            self.g.add_person(p)

        self.g.add_parent_child("ggf", "gf")
        self.g.add_parent_child("ggf", "guncle")

        self.g.add_parent_child("gf", "father")
        self.g.add_parent_child("gf", "uncle")
        self.g.add_parent_child("gf", "aunt")

        self.g.add_parent_child("father", "me")
        self.g.add_parent_child("father", "sister")

        self.g.add_marriage("me", "spouse")
        self.g.add_parent_child("me", "child")

        self.g.add_parent_child("s_father", "spouse")
        self.g.add_parent_child("s_mother", "spouse")
        self.g.add_parent_child("s_father", "s_brother")

        self.assertEqual(get_relationship(self.g, "me", "father")["relationship"], CanonicalRelationship.FATHER.value)
        self.assertEqual(get_relationship(self.g, "me", "gf")["relationship"], CanonicalRelationship.PATERNAL_GRANDFATHER.value)
        self.assertEqual(get_relationship(self.g, "me", "uncle")["relationship"], CanonicalRelationship.PATERNAL_UNCLE.value)
        self.assertEqual(get_relationship(self.g, "me", "aunt")["relationship"], CanonicalRelationship.PATERNAL_AUNT.value)
        self.assertEqual(get_relationship(self.g, "me", "s_father")["relationship"], CanonicalRelationship.FATHER_IN_LAW.value)
        self.assertEqual(get_relationship(self.g, "me", "s_mother")["relationship"], CanonicalRelationship.MOTHER_IN_LAW.value)
        self.assertEqual(get_relationship(self.g, "me", "s_brother")["relationship"], CanonicalRelationship.BROTHER_IN_LAW.value)

    def test_14_infinite_recursive_depth_granduncle(self):
        me = Person("me", "Bheema", "male")
        father = Person("father", "Kiran", "male")
        gf = Person("gf", "Rama Rao", "male")
        guncle = Person("guncle", "Lakshman", "male")
        ggf = Person("ggf", "Venkat Rao", "male")

        for p in [me, father, gf, guncle, ggf]:
            self.g.add_person(p)

        self.g.add_parent_child("father", "me")
        self.g.add_parent_child("gf", "father")
        self.g.add_parent_child("ggf", "gf")
        self.g.add_parent_child("ggf", "guncle")

        res = get_relationship(self.g, "me", "guncle")
        self.assertIn("Grand-Uncle", res["display_name"])

    def test_15_cobrother_and_cosister(self):
        me = Person("me", "Bheema", "male")
        spouse = Person("spouse", "Ananya", "female")
        sil = Person("sil", "Pooja", "female")
        cobrother = Person("cobrother", "Rohan", "male")
        fil = Person("fil", "Venkat", "male")

        for p in [me, spouse, sil, cobrother, fil]:
            self.g.add_person(p)

        self.g.add_marriage("me", "spouse")
        self.g.add_parent_child("fil", "spouse")
        self.g.add_parent_child("fil", "sil")
        self.g.add_marriage("sil", "cobrother")

        res = get_relationship(self.g, "me", "cobrother")
        self.assertEqual(res["relationship"], CanonicalRelationship.CO_BROTHER.value)
        self.assertEqual(res["display_name"], "Co-brother")

    def test_16_regional_translation_telugu(self):
        me = Person("me", "Bheema", "male")
        mother = Person("mother", "Sujatha", "female")
        m_uncle = Person("m_uncle", "Srinivas", "male")
        gfather = Person("gfather", "Laxman Rao", "male")

        self.g.add_parent_child("mother", "me")
        self.g.add_parent_child("gfather", "mother")
        self.g.add_parent_child("gfather", "m_uncle")

        res = translate_relationship(get_relationship(self.g, "me", "m_uncle"), "telugu")
        self.assertEqual(res["cultural_term"], "Māmā")

    def test_17_regional_translation_tamil(self):
        me = Person("me", "Bheema", "male")
        father = Person("father", "Kiran", "male")
        uncle = Person("uncle", "Ravi", "male")
        gfather = Person("gfather", "Rama Rao", "male")

        self.g.add_parent_child("father", "me")
        self.g.add_parent_child("gfather", "father")
        self.g.add_parent_child("gfather", "uncle")

        res = translate_relationship(get_relationship(self.g, "me", "uncle"), "tamil")
        self.assertIn("Chithappa", res["cultural_term"])

    def test_18_regional_translation_hindi(self):
        me = Person("me", "Bheema", "male")
        mother = Person("mother", "Sujatha", "female")
        m_aunt = Person("m_aunt", "Lakshmi", "female")
        gfather = Person("gfather", "Laxman Rao", "male")

        self.g.add_person(me)
        self.g.add_person(mother)
        self.g.add_person(m_aunt)
        self.g.add_person(gfather)

        self.g.add_parent_child("mother", "me")
        self.g.add_parent_child("gfather", "mother")
        self.g.add_parent_child("gfather", "m_aunt")

        res = translate_relationship(get_relationship(self.g, "me", "m_aunt"), "hindi")
        self.assertEqual(res["cultural_term"], "Masi")

    def test_19_regional_translation_kannada(self):
        me = Person("me", "Bheema", "male")
        spouse = Person("spouse", "Ananya", "female")
        fil = Person("fil", "Venkat", "male")

        self.g.add_marriage("me", "spouse")
        self.g.add_parent_child("fil", "spouse")

        res = translate_relationship(get_relationship(self.g, "me", "fil"), "kannada")
        self.assertEqual(res["cultural_term"], "Mava")

    def test_20_regional_translation_malayalam(self):
        me = Person("me", "Bheema", "male")
        mother = Person("mother", "Sujatha", "female")
        m_uncle = Person("m_uncle", "Srinivas", "male")
        gfather = Person("gfather", "Laxman Rao", "male")

        self.g.add_parent_child("mother", "me")
        self.g.add_parent_child("gfather", "mother")
        self.g.add_parent_child("gfather", "m_uncle")

        res = translate_relationship(get_relationship(self.g, "me", "m_uncle"), "malayalam")
        self.assertEqual(res["cultural_term"], "Ammavan")

    def test_21_database_invariant_and_perspective_matrix(self):
        """
        User Rule #19, #20, #21: Golden Test Family Graph.
        Verifies that evaluating the SAME family graph from 5 different viewer perspectives
        produces exact viewer-specific labels while the underlying database graph facts
        remain 100% identical (ZERO mutation).
        """
        ggf = Person("ggf", "Great Grandfather", "male")
        gf = Person("gf", "Grandfather", "male")
        sujatha = Person("sujatha", "Sujatha", "female")
        uncle = Person("uncle", "Kiran", "male")
        bheema = Person("bheema", "Bheema", "male")
        child = Person("child", "Child", "male")

        for p in [ggf, gf, sujatha, uncle, bheema, child]:
            self.g.add_person(p)

        self.g.add_parent_child("ggf", "gf")
        self.g.add_parent_child("gf", "sujatha")
        self.g.add_parent_child("gf", "uncle")
        self.g.add_parent_child("sujatha", "bheema")
        self.g.add_parent_child("bheema", "child")

        # Snapshot graph before perspective evaluations
        adj_before = {k: list(v) for k, v in self.g.adj.items()}

        # 1. Perspective Sujatha
        r_suj_bheema = get_relationship(self.g, "sujatha", "bheema")
        r_suj_gf = get_relationship(self.g, "sujatha", "gf")
        self.assertEqual(r_suj_bheema["relationship"], CanonicalRelationship.SON.value)
        self.assertEqual(r_suj_gf["relationship"], CanonicalRelationship.FATHER.value)

        # 2. Perspective Bheema
        r_bhe_suj = get_relationship(self.g, "bheema", "sujatha")
        r_bhe_gf = get_relationship(self.g, "bheema", "gf")
        self.assertEqual(r_bhe_suj["relationship"], CanonicalRelationship.MOTHER.value)
        self.assertEqual(r_bhe_gf["relationship"], CanonicalRelationship.MATERNAL_GRANDFATHER.value)

        # 3. Perspective Child
        r_chi_bhe = get_relationship(self.g, "child", "bheema")
        r_chi_suj = get_relationship(self.g, "child", "sujatha")
        self.assertEqual(r_chi_bhe["relationship"], CanonicalRelationship.FATHER.value)
        self.assertEqual(r_chi_suj["relationship"], CanonicalRelationship.PATERNAL_GRANDMOTHER.value)

        # 4. Perspective Grandfather
        r_gf_bheema = get_relationship(self.g, "gf", "bheema")
        self.assertEqual(r_gf_bheema["relationship"], CanonicalRelationship.GRANDSON.value)

        # 5. Perspective Uncle
        r_unc_bheema = get_relationship(self.g, "uncle", "bheema")
        self.assertEqual(r_unc_bheema["relationship"], CanonicalRelationship.NEPHEW.value)

        # Snapshot graph after perspective evaluations
        adj_after = {k: list(v) for k, v in self.g.adj.items()}

        # Database Invariant Assertion: Changing viewer MUST BE 100% READ-ONLY!
        self.assertEqual(adj_before, adj_after)

if __name__ == "__main__":
    unittest.main()
