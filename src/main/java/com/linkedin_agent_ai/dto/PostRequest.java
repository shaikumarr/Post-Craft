package com.linkedin_agent_ai.dto;

import java.util.List;

public class PostRequest {

    private String achievement;

    private List<String> skills;

    private String tone;

	public String getAchievement() {
		return achievement;
	}

	public void setAchievement(String achievement) {
		this.achievement = achievement;
	}

	public List<String> getSkills() {
		return skills;
	}

	public void setSkills(List<String> skills) {
		this.skills = skills;
	}

	public String getTone() {
		return tone;
	}

	public void setTone(String tone) {
		this.tone = tone;
	}
    
}