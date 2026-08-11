package com.Issue.Tracker.service;

import com.Issue.Tracker.Entity.IssueTrack;
import com.Issue.Tracker.dto.IssueSummaryDto;
import com.Issue.Tracker.repository.IssueTrackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class IssueTrackService {

    @Autowired
    private IssueTrackRepository repository;

    public List<IssueTrack> getAllIssues(String module, List<Integer> months, Integer year,
                                         LocalDate startDate,LocalDate endDate, String assignee) {
     return repository.filterIssues(
             (module != null && !module.isEmpty() && !"ALL".equalsIgnoreCase(module)) ? module :null,
             (months !=null && !months.isEmpty()) ? months :null,
             year,startDate,endDate,
             (assignee !=null && !assignee.trim().isEmpty()) ? assignee.trim() :null
     );
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
            existing.setL3UpdatesRemarks(updated.getL3UpdatesRemarks());
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

    public Map<String, Object> getMonthlySummaryCounts(String module, List<Integer> months) {
    Map<String,Object> summary = new HashMap<>();

    String targetModule = (module != null && !module.isEmpty() && !"ALL".equalsIgnoreCase(module)) ? module : null;
    List<Integer> targetMonth = (months != null && !months.isEmpty()) ? months : null;

    String[] statuses = {"Closed", "Open with Bank", "Open with Infosys and L3"};
    List<Map<String, Object>> summaryList = new ArrayList<>();

    for (String status : statuses){
        long domestic = repository.countByStatusAndEntity(targetModule, status, "Domestic",targetMonth);
        long rrb = repository.countByStatusAndEntity(targetModule, status,"RRB", targetMonth);
        long overseas = repository.countByStatusAndEntity(targetModule, status, "overseas", targetMonth);
        long total = domestic + rrb+ overseas;

        Map<String ,Object> row = new HashMap<>();
        row.put("category",status);
        row.put("domesticCount",domestic);
        row.put("rrbCount", rrb);
        row.put("overseasCount",overseas);
        row.put("totalCount", total);
        summaryList.add(row);

    }

    summary.put("matrix", summaryList);
    //summary.put("totalIssues", repository.filterIssues(module, month,null).size());
    return summary;
    }

    public List<IssueTrack> saveAllIssues(List<IssueTrack> issues) {
        return repository.saveAll(issues);
    }
}
