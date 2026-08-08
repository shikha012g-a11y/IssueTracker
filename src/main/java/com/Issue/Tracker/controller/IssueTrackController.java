package com.Issue.Tracker.controller;

import com.Issue.Tracker.Entity.IssueTrack;
import com.Issue.Tracker.service.IssueTrackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/issues")
@CrossOrigin(origins = "*") //Allows Local HTML frontend access
public class IssueTrackController {

    @Autowired
    private IssueTrackService service;

    @GetMapping
    public List<IssueTrack> getIssues(@RequestParam(required = false) String module,
                                      @RequestParam(required = false) Integer month,
                                      @RequestParam(required = false) Integer year){
        return service.getAllIssues(module, month,year);
    }

    @PostMapping
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
                                          @RequestParam(required = false) Integer month){
        return service.getMonthlySummaryCounts(module,month);
    }


}
