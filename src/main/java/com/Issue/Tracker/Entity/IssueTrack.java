package com.Issue.Tracker.Entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name="Tracker")
public class IssueTrack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty("id")
    private Long id;

    @Column(nullable = false)
    @JsonProperty("module")
    private String module;

    @Column(nullable = false)
    @JsonProperty("entity")
    private String entity;

    @Column(nullable = false)
    @JsonProperty("environment")
    private String environment;

    @Column(name = "reported_date", nullable = false)
    @JsonProperty("reportedDate")
    private LocalDate reportedDate;

    @Column(name = "issue_description", columnDefinition = "TEXT", nullable = false)
    @JsonProperty("issueDescription")
    private String issueDescription;

    @Column(name = "l2_analysis", columnDefinition = "TEXT")
    @JsonProperty("l2Analysis")
    private String l2Analysis;

    @Column(name = "tol_id")
    @JsonProperty("tolId")
    private String tolId;

    @Column(name = "l3_updates_remarks", columnDefinition = "TEXT")
    @JsonProperty("l3UpdatesRemarks")
    private String l3UpdatesRemarks;

    @Column(name = "issue_status", nullable = false)
    @JsonProperty("issueStatus")
    private String issueStatus;

    @Column(name = "closure_date")
    @JsonProperty("closureDate")
    private LocalDate closureDate;

    @Column(name = "closure_category")
    @JsonProperty("closureCategory")
    protected String closureCategory;

    @Column(name = "assignee")
    @JsonProperty("assignee")
    private String assignee;

    @JsonProperty("coAssignee")
    protected String coAssignee;


    public IssueTrack() {
    }

    public IssueTrack(Long id, String module, String entity,
                      LocalDate reportedDate, String environment,
                      String issueDescription, String l2Analysis,
                      String tolId, String l3UpdatesRemarks,
                      LocalDate closureDate, String issueStatus,
                      String closureCategory, String assignee,
                      String coAssignee) {
        this.id = id;
        this.module = module;
        this.entity = entity;
        this.reportedDate = reportedDate;
        this.environment = environment;
        this.issueDescription = issueDescription;
        this.l2Analysis = l2Analysis;
        this.tolId = tolId;
        l3UpdatesRemarks = l3UpdatesRemarks;
        this.closureDate = closureDate;
        this.issueStatus = issueStatus;
        this.closureCategory = closureCategory;
        this.assignee = assignee;
        this.coAssignee = coAssignee;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public String getEntity() {
        return entity;
    }

    public void setEntity(String entity) {
        this.entity = entity;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public LocalDate getReportedDate() {
        return reportedDate;
    }

    public void setReportedDate(LocalDate reportedDate) {
        this.reportedDate = reportedDate;
    }

    public String getIssueDescription() {
        return issueDescription;
    }

    public void setIssueDescription(String issueDescription) {
        this.issueDescription = issueDescription;
    }

    public String getL2Analysis() {
        return l2Analysis;
    }

    public void setL2Analysis(String l2Analysis) {
        this.l2Analysis = l2Analysis;
    }

    public String getTolId() {
        return tolId;
    }

    public void setTolId(String tolId) {
        this.tolId = tolId;
    }

    public String getl3UpdatesRemarks() {
        return l3UpdatesRemarks;
    }

    public void setl3UpdatesRemarks(String l3UpdatesRemarks) {
        l3UpdatesRemarks = l3UpdatesRemarks;
    }

    public String getIssueStatus() {
        return issueStatus;
    }

    public void setIssueStatus(String issueStatus) {
        this.issueStatus = issueStatus;
    }

    public LocalDate getClosureDate() {
        return closureDate;
    }

    public void setClosureDate(LocalDate closureDate) {
        this.closureDate = closureDate;
    }

    public String getClosureCategory() {
        return closureCategory;
    }

    public void setClosureCategory(String closureCategory) {
        this.closureCategory = closureCategory;
    }

    public String getAssignee() {
        return assignee;
    }

    public void setAssignee(String assignee) {
        this.assignee = assignee;
    }

    public String getCoAssignee() {
        return coAssignee;
    }

    public void setCoAssignee(String coAssignee) {
        this.coAssignee = coAssignee;
    }

    @Override
    public String toString() {
        return "IssueTrack{" +
                "id=" + id +
                ", module='" + module + '\'' +
                ", entity='" + entity + '\'' +
                ", environment='" + environment + '\'' +
                ", reportedDate=" + reportedDate +
                ", issueDescription='" + issueDescription + '\'' +
                ", l2Analysis='" + l2Analysis + '\'' +
                ", tolId='" + tolId + '\'' +
                ", l3UpdatesRemarks='" + l3UpdatesRemarks + '\'' +
                ", issueStatus='" + issueStatus + '\'' +
                ", closureDate=" + closureDate +
                ", closureCategory='" + closureCategory + '\'' +
                ", assignee='" + assignee + '\'' +
                ", coAssignee='" + coAssignee + '\'' +
                '}';
    }
}
