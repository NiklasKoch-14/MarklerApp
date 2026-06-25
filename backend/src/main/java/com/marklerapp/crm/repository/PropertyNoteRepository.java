package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PropertyNoteRepository extends JpaRepository<PropertyNote, UUID> {

    @Query("SELECT n FROM PropertyNote n JOIN FETCH n.agent JOIN FETCH n.property WHERE n.id = :id")
    Optional<PropertyNote> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT n FROM PropertyNote n JOIN FETCH n.agent JOIN FETCH n.property WHERE n.property = :property ORDER BY n.createdAt DESC")
    List<PropertyNote> findByPropertyOrderByCreatedAtDesc(@Param("property") Property property);
}
