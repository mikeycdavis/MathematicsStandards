/-
  A real, complete Lean development for this fixture.

  It also carries the use-versus-mention regression: the comment below and the string literal
  further down both contain the word that the placeholder detector looks for. Neither is a
  placeholder, and a detector that fires on either is reporting a mention as a use.
-/

-- TODO: remove the sorry from Draft.lean before the next release.

theorem sq_nonneg' (x : Int) : 0 ≤ x * x := by
  exact mul_self_nonneg x

def statusMessage : String := "sorry, that proof is not finished"

def anotherMessage : String := "admit nothing"
