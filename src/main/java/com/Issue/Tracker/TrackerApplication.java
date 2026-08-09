package com.Issue.Tracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = "com.Issue.Tracker")
public class TrackerApplication {

	public static void main(String[] args) {

		SpringApplication.run(TrackerApplication.class, args);


	}

}
