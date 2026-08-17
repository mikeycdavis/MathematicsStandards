# A repository that has not usefully adopted these standards

One half of the not-evaluated pair. The two halves are byte-identical apart from `project-policy.yml`:
`not-evaluated-absent-policy` has none, and `not-evaluated-unreadable-policy` has one that does not
parse. Both reach `NOT_EVALUATED` by different routes, and the pair exists to pin one property:

    a status of NOT_EVALUATED carries no compliance score, so neither half can rank above the other.

This file is identical in both halves on purpose. If it differed, the halves would differ in what the
detectors read as well as in the policy, and the comparison would stop isolating the policy.

Before the property held, the half with the broken policy scored 80 and this pairing scored 50 — the
higher number belonging to the repository that had made its configuration worse.
