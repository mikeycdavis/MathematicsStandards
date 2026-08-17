# A repository that has not adopted these standards

The BEFORE half of the not-evaluated pair. It has no `project-policy.yml`, so nothing has decided
which rules govern it and `validate` reaches `NOT_EVALUATED`.

Its twin `not-evaluated-unreadable-policy` is byte-identical apart from a `project-policy.yml` that
does not parse. Both reach the same status by different routes, and the pair exists to pin one
property:

    a status of NOT_EVALUATED carries no compliance score, so neither half can rank above the other.

Before that property held, the twin with the broken policy scored HIGHER than this one.
