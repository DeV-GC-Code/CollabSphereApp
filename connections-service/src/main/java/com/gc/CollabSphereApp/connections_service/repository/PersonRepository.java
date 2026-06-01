package com.gc.CollabSphereApp.connections_service.repository;


import com.gc.CollabSphereApp.connections_service.entity.Person;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;

import java.util.List;
import java.util.Optional;

public interface PersonRepository extends Neo4jRepository<Person, Long> {

    Optional<Person> getByName(String name);

    Optional<Person> findByUserId(Long userId);

    @Query("""
      MATCH (p:Person)
      WHERE p.userId <> $userId
        AND (
          $query IS NULL OR trim($query) = '' OR
          toLower(coalesce(p.name, '')) CONTAINS toLower($query) OR
          toLower(coalesce(p.email, '')) CONTAINS toLower($query) OR
          toLower(coalesce(p.worksAt, '')) CONTAINS toLower($query)
        )
      RETURN p
      ORDER BY p.name ASC
      LIMIT 50
    """)
    List<Person> searchPeople(Long userId, String query);

    @Query("""
      MATCH (me:Person {userId: $userId})-[:CONNECTED_TO]-(person:Person)
      RETURN DISTINCT person
      ORDER BY person.name ASC
    """)
    List<Person> getAcceptedConnections(Long userId);

    @Query("""
      MATCH (sender:Person)-[:REQUESTED_TO]->(:Person {userId: $userId})
      RETURN DISTINCT sender
      ORDER BY sender.name ASC
    """)
    List<Person> getReceivedConnectionRequests(Long userId);

    @Query("""
      MATCH (:Person {userId: $userId})-[:REQUESTED_TO]->(receiver:Person)
      RETURN DISTINCT receiver
      ORDER BY receiver.name ASC
    """)
    List<Person> getSentConnectionRequests(Long userId);

    @Query("MATCH (p1:Person)-[r:REQUESTED_TO]->(p2:Person) " +
            "WHERE p1.userId = $senderId AND p2.userId = $receiverId " +
            "RETURN count(r) > 0")
    boolean connectionRequestExists(Long senderId, Long receiverId);

    @Query("MATCH (p1:Person)-[r:CONNECTED_TO]-(p2:Person) " +
            "WHERE p1.userId = $senderId AND p2.userId = $receiverId " +
            "RETURN count(r) > 0")
    boolean alreadyConnected(Long senderId, Long receiverId);

    @Query("MATCH (p1:Person {userId: $senderId}) MATCH (p2:Person {userId: $receiverId}) MERGE (p1)-[:REQUESTED_TO]->(p2)")
    void addConnectionRequest(Long senderId, Long receiverId);

    @Query("MATCH (p1:Person)-[r:REQUESTED_TO]->(p2:Person) " +
            "WHERE p1.userId = $senderId AND p2.userId = $receiverId " +
            "DELETE r " +
            "MERGE (p1)-[:CONNECTED_TO]->(p2) " +
            "MERGE (p2)-[:CONNECTED_TO]->(p1)")
    void acceptConnectionRequest(Long senderId, Long receiverId);

    @Query("MATCH (p1:Person)-[r:REQUESTED_TO]->(p2:Person) " +
            "WHERE p1.userId = $senderId AND p2.userId = $receiverId " +
            "DELETE r")
    void rejectConnectionRequest(Long senderId, Long receiverId);

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
