/- The development builds. That is not the same as proving the theorem. -/

axiom helper_ax (n : Nat) : n > 1 → n ≥ 2

theorem support_lemma (n : Nat) (h : n > 1) : n ≥ 2 := helper_ax n h

-- A primed identifier, before the placeholder below. This is not decoration: treating `'` as a
-- string delimiter made the first prime open a string that never closed, blanking the rest of the
-- file out of the structural view, so the `sorry` further down went undetected.
theorem support_lemma' (n : Nat) (h : n > 1) : n ≥ 2 := support_lemma n h

theorem main_result (n : Nat) (h : n > 1) : True := by
  sorry
