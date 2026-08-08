package com.Issue.Tracker.service;

import com.Issue.Tracker.Entity.IssueTrack;
import com.Issue.Tracker.dto.IssueSummaryDto;
import com.Issue.Tracker.repository.IssueTrackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class IssueTrackService {

    @Autowired
    private IssueTrackRepository repository;

    public List<IssueTrack> getAllIssues(String module, Integer month, Integer year) {
     return repository.filterIssues(module,month,year);
    }

    public IssueTrack createIssue(IssueTrack issue) {
        return repository.save(issue);
    }

    public IssueTrack updateIssues(Long id, IssueTrack updated) {
        return repository.findById(id).map(existing -> {
            existing.setModule(updated.getModule());
            existing.setEntity(updated.getEntity());
            existing.setEnvironment(updated.getEnvironment());
            existing.setReportedDate(updated.getReportedDate());
            existing.setIssueDescription(updated.getIssueDescription());
            existing.setL2Analysis(updated.getL2Analysis());
            existing.setTolId(updated.getTolId());
            existing.setl3UpdatesRemarks(updated.getl3UpdatesRemarks());
            existing.setIssueStatus(updated.getIssueStatus());
            existing.setClosureDate(updated.getClosureDate());
            existing.setClosureCategory(updated.getClosureCategory());
            existing.setAssignee(updated.getAssignee());
            existing.setCoAssignee(updated.getCoAssignee());
            return repository.save(existing);
        }).orElseThrow(()->new RuntimeException("Issue not fount with id:" + id));
    }

    public void deleteIssue(Long id) {
        repository.deleteById(id);
    }

    public Map<String, Object> getMonthlySummaryCounts(String module, Integer month) {
    Map<String,Object> summary = new HashMap<>();

    String[] statuses = {"Closed", "Open with Bank", "Open with Infosys and L3"};
    List<IssueSummaryDto> summaryList = new ArrayList<>();

    for (String status : statuses){
        long domestic = repository.countByStatusAndEntity(module, status, "Domestic",month);
        long rrb = repository.countByStatusAndEntity(module, status,"RRB", month);
        long overseas = repository.countByStatusAndEntity(module, status, "overseas", month);
        long total = domestic + rrb+ overseas;

        summaryList.add(new IssueSummaryDto(status,domestic,rrb,overseas,total));
    }

    summary.put("matrix", summaryList);
    summary.put("totalIssues", repository.filterIssues(module, month,null).size());
    return summary;
    }
}
