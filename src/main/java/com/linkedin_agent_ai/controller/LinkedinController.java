package com.linkedin_agent_ai.controller;

import org.springframework.web.bind.annotation.*;

import com.linkedin_agent_ai.dto.PostRequest;
import com.linkedin_agent_ai.dto.PostResponse;
import com.linkedin_agent_ai.service.LinkedinAgentService;

@RestController
@RequestMapping("/api/linkedin")
@CrossOrigin(origins = "*")
public class LinkedinController {

    private final LinkedinAgentService linkedinAgentService;

    public LinkedinController(
            LinkedinAgentService linkedinAgentService) {
        this.linkedinAgentService = linkedinAgentService;
    }


    @GetMapping("/generate")
    public String generateTest() {
        return "Use POST request with JSON body";
    }

    @PostMapping("/generate")
    public PostResponse generatePost(
            @RequestBody PostRequest request) {

        return linkedinAgentService.generate(request);
    }
    
}