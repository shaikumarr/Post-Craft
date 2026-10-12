package com.linkedin_agent_ai.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.linkedin_agent_ai.entity.PostHistory;

/**
 * Database access for saved posts. Spring generates the implementation,
 * so this is an interface with no method bodies.
 */
public interface PostHistoryRepository extends JpaRepository<PostHistory, Long> {

    /** Newest posts first, handy for a "past posts" list. */
    List<PostHistory> findAllByOrderByCreatedDateDesc();
}