theorem demo_induction (n : Nat) : 0 + n = n := by
  induction n with
  | zero => rfl
  | succ k ih => omega
