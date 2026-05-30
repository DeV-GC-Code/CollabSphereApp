package com.gc.CollabSphereApp.connections_service.repository;


import com.gc.CollabSphereApp.connections_service.entity.Person;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;

import java.util.List;
import java.util.Optional;

public interface PersonRepository extends Neo4jRepository<Person, Long> {

    Optional<Person> getByName(String name);

    Optional<Person> findByUserId(Long userId);

    @Query("MATCH (personA:Person)-[:CONNECTED_TO|COLLEAGUE_WITH]-(personB:Person) " +
            "WHERE personA.userId = $userId " +
            "RETURN DISTINCT personB")

    List<Person> getFirstDegreeConnections(Long userId);
    @Query("MATCH (p1:Person)-[r:REQUESTED_TO]->(p2:Person) " +
            "WHERE p1.userId = $senderId AND p2.userId = $receiverId " +
            "RETURN count(r) > 0")
    boolean connectionRequestExists(Long senderId, Long receiverId);

    @Query("MATCH (p1:Person)-[r:CONNECTED_TO]-(p2:Person) " +
            "WHERE p1.userId = $senderId AND p2.userId = $receiverId " +
            "RETURN count(r) > 0")
    boolean alreadyConnected(Long senderId, Long receiverId);

    @Query("MATCH (p1:Person {userId: $senderId}) MATCH (p2:Person {userId: $receiverId}) CREATE (p1)-[:REQUESTED_TO]->(p2)")
    void addConnectionRequest(Long senderId, Long receiverId);

    @Query("MATCH (p1:Person)-[r:REQUESTED_TO]->(p2:Person) " +
            "WHERE p1.userId = $senderId AND p2.userId = $receiverId " +
            "DELETE r " +
            "CREATE (p1)-[:CONNECTED_TO]->(p2) " +
            "CREATE (p2)-[:CONNECTED_TO]->(p1)")
    void acceptConnectionRequest(Long senderId, Long receiverId);

    @Query("MATCH (p1:Person)-[r:REQUESTED_TO]->(p2:Person) " +
            "WHERE p1.userId = $senderId AND p2.userId = $receiverId " +
            "DELETE r")
    void rejectConnectionRequest(Long senderId, Long receiverId);

    /**
     * Retrieves third-degree connections: exactly three hops away via CONNECTED_TO or COLLEAGUE_WITH,
     * excluding connections reachable in 1 or 2 hops.
     */
    @Query("""
      MATCH (u:Person {userId: $userId})
      MATCH path = (u)-[:CONNECTED_TO|COLLEAGUE_WITH*3]-(t:Person)
      WHERE NOT (u)-[:CONNECTED_TO|COLLEAGUE_WITH*1..2]-(t)
        AND t.userId <> $userId
      RETURN DISTINCT t
    """)
    List<Person> getThirdDegreeConnections(Long userId);

    @Query("MATCH (me:Person {userId: $userId}) MATCH (me)-[:CONNECTED_TO|COLLEAGUE_WITH]-(first:Person) MATCH (first)-[:CONNECTED_TO|COLLEAGUE_WITH]-(second:Person) WHERE second.userId <> $userId AND NOT (me)-[:CONNECTED_TO|COLLEAGUE_WITH]-(second) RETURN DISTINCT second")
    public List<Person> getSecondDegreeConnections(Long userId);

    @Query("""
MERGE (p:Person {userId: $userId})
SET p.name = $name, p.email = $email, p.worksAt = $worksAt, p.updatedAt = $updatedAt
WITH p
OPTIONAL MATCH (p)-[worksAt:WORKS_AT]->(:Company)
DELETE worksAt
WITH p
OPTIONAL MATCH (p)-[colleagueWith:COLLEAGUE_WITH]-(:Person)
DELETE colleagueWith
""")
    void upsertPersonAndClearDerivedRelationships(Long userId, String name, String email, String worksAt, java.time.LocalDateTime updatedAt);

    @Query("""
MATCH (p:Person {userId: $userId})
MERGE (c:Company {name: $worksAt})
MERGE (p)-[:WORKS_AT]->(c)
WITH p, c
MATCH (colleague:Person)-[:WORKS_AT]->(c)
WHERE colleague.userId <> $userId
MERGE (p)-[:COLLEAGUE_WITH]->(colleague)
MERGE (colleague)-[:COLLEAGUE_WITH]->(p)
""")
    void linkPersonToCompanyAndColleagues(Long userId, String worksAt);
}
