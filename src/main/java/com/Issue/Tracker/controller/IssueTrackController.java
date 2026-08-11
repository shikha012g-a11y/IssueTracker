package com.Issue.Tracker.controller;

import com.Issue.Tracker.Entity.IssueTrack;
import com.Issue.Tracker.service.IssueTrackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/issues")
@CrossOrigin(origins = "*", allowedHeaders = "*") //Allows Local HTML frontend access
public class IssueTrackController {

    @Autowired
    private IssueTrackService service;

    @GetMapping({"", "/"})
    public List<IssueTrack> getIssues(@RequestParam(required = false) String module,
                                      @RequestParam(required = false) List<Integer> months,
                                      @RequestParam(required = false) Integer year,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)LocalDate startDate,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                      @RequestParam(required = false) String assignee){
        return service.getAllIssues(module, months,year,startDate,endDate,assignee);
    }

    @PostMapping({"", "/"})
    public IssueTrack createIssue(@RequestBody IssueTrack issue){
        return service.createIssue(issue);
    }

    @PutMapping("/{id}")
    public IssueTrack updateIssue(@PathVariable Long id, @RequestBody IssueTrack issue){
        return service.updateIssues(id, issue);
    }

    @DeleteMapping("/{id}")
    public void deleteIssue(@PathVariable Long id){
        service.deleteIssue(id);
    }

    @GetMapping("/summary")
    public Map<String, Object> getSummary(@RequestParam(required = false) String module,
                                          @RequestParam(required = false) List<Integer> months){
        return service.getMonthlySummaryCounts(module,months);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<IssueTrack>> createBatchIssues(@RequestBody List<IssueTrack> issues){
        List<IssueTrack> savedIssues = service.saveAllIssues(issues);
        return ResponseEntity.ok(savedIssues);
    }
}
