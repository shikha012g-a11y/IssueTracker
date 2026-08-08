package com.Issue.Tracker.dto;


public class IssueSummaryDto {

    private String category;
    private long domesticCount;
    private long rrbCount;
    private long overseasCount;
    private long totalCount;

    public IssueSummaryDto() {
    }

    public IssueSummaryDto(String category,
                           long domesticCount, long rrbCount,
                           long overseasCount, long totalCount) {
        this.category = category;
        this.domesticCount = domesticCount;
        this.rrbCount = rrbCount;
        this.overseasCount = overseasCount;
        this.totalCount = totalCount;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public long getDomesticCount() {
        return domesticCount;
    }

    public void setDomesticCount(long domesticCount) {
        this.domesticCount = domesticCount;
    }

    public long getRrbCount() {
        return rrbCount;
    }

    public void setRrbCount(long rrbCount) {
        this.rrbCount = rrbCount;
    }

    public long getOverseasCount() {
        return overseasCount;
    }

    public void setOverseasCount(long overseasCount) {
        this.overseasCount = overseasCount;
    }

    public long getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(long totalCount) {
        this.totalCount = totalCount;
    }

    @Override
    public String toString() {
        return "IssueSummaryDto{" +
                "category='" + category + '\'' +
                ", domesticCount=" + domesticCount +
                ", rrbCount=" + rrbCount +
                ", overseasCount=" + overseasCount +
                ", totalCount=" + totalCount +
                '}';
    }
}
