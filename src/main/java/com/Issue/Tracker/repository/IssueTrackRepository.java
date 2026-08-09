package com.Issue.Tracker.repository;

import com.Issue.Tracker.Entity.IssueTrack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface IssueTrackRepository extends JpaRepository<IssueTrack,Long> {

  List<IssueTrack> findByModule(String module);

    @Query("""
            SELECT i FROM IssueTrack i WHERE 
            (:module IS NULL OR i.module = :module) 
            AND (:months IS NULL OR MONTH(i.reportedDate) IN :months)
            AND (:year IS NULL OR YEAR(i.reportedDate) = :year)
            AND (:startDate IS NULL OR i.reportedDate >= :startDate)
            AND (:endDate IS NULL OR i.reportedDate <= :endDate)
            AND (:assignee IS NULL OR LOWER(i.assignee) LIKE LOWER(CONCAT('%' ,:assignee, '%'))
              OR LOWER(i.coAssignee) LIKE LOWER(CONCAT('%', :assignee , '%')))
             """)
         List<IssueTrack> filterIssues(
            @Param("module") String module,
            @Param("months") List<Integer> months,
            @Param("year") Integer year,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("assignee") String assignee
    );

    @Query("""
           SELECT COUNT(i) FROM IssueTrack i WHERE 
           (:module IS NULL OR i.module = :module) AND 
            i.issueStatus = :status AND 
            i.entity = :entity AND  
            (:months IS NULL OR MONTH(i.reportedDate) IN :months)""")
    long countByStatusAndEntity(
            @Param("module") String module,
            @Param("status") String status,
            @Param("entity") String entity,
            @Param("months") List<Integer> months
    );
}
