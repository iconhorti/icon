from database import Base, engine
import models

print("Tables in Base.metadata:")
for t in Base.metadata.sorted_tables:
    print(t.name)
