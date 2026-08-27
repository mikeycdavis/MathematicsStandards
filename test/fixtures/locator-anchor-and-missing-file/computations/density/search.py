# Exhaustive search, exact integer arithmetic only.
from itertools import count

def gaps(seq):
    return [b - a for a, b in zip(seq, seq[1:])]

