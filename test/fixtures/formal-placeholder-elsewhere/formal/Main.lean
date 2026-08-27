/- The development builds. That is not the same as proving the theorem. -/

theorem support_lemma (n : Nat) (h : n > 1) : n ≥ 2 := Nat.succ_le_of_lt h

-- The declaration the Formal block names. It carries no placeholder of its own.
theorem main_result (n : Nat) (h : n > 1) : True := trivial

/- An unrelated experiment further down the same file. `main_result` above does not reference it.
   Whether the target's proof depends on this is exactly what the detector cannot determine, which
   is why the whole file is the envelope and why the finding must not claim otherwise. -/
theorem unrelated_scratch (n : Nat) : n = n := by
  sorry
