package com.linkedin_agent_ai.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.linkedin_agent_ai.dto.PostRequest;
import com.linkedin_agent_ai.dto.PostResponse;

/**
 * Sits between the controller and Gemini.
 * Generates the post and returns it. Nothing is stored.
 */
@Service
public class LinkedinAgentService {

    private final GeminiService geminiService;

    public LinkedinAgentService(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    public PostResponse generate(PostRequest request) {

        if (request.getAchievement() == null || request.getAchievement().isBlank()) {
            throw new IllegalArgumentException("Achievement is required");
        }

        String tone = (request.getTone() == null || request.getTone().isBlank())
                ? "Professional"
                : request.getTone();

        List<String> skills = request.getSkills() == null ? List.of() : request.getSkills();

        Map<String, Object> result =
                geminiService.generatePost(request.getAchievement(), tone, skills);

        PostResponse response = new PostResponse();
        response.setContent((String) result.get("content"));
        response.setHashtags((String) result.get("hashtags"));
        response.setEngagementTips((String) result.get("engagementTips"));
        return response;
    }
}