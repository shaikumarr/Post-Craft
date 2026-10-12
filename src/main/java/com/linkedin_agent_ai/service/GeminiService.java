package com.linkedin_agent_ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Calls the Gemini API so every request produces a fresh post
 * based on the achievement, tone and skills the user sent.
 */
@Service
public class GeminiService {

    private static final String BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/";

    @Value("${gemini.api.key}")
    private String apiKey;

    // Change in application.properties if Google retires this model name
    @Value("${gemini.model:gemini-2.5-flash}")
    private String model;

    // Optional backup model, used if the main one is busy or retired
    @Value("${gemini.fallback-model:}")
    private String fallbackModel;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Keeps your existing signature: send any prompt, get plain text back.
     */
    public String generateContent(String prompt) {
        return callGemini(prompt, false);
    }

    /**
     * Builds the prompt from the form fields and returns
     * {content, hashtags, engagementTips}, which is exactly what the frontend expects.
     */
    public Map<String, Object> generatePost(String achievement, String tone, List<String> skills) {

        String prompt = """
                Write a LinkedIn post for the achievement below.

                Achievement: %s
                Tone: %s
                Skills to mention: %s

                Rules:
                - Write in first person, in the requested tone, and make it specific to the achievement.
                - Do NOT use generic phrases like "I have successfully completed" or "Thank you to everyone who supported me".
                - Keep it under 1300 characters, with short paragraphs and at most 3 emojis.
                - End with a question that invites comments.

                Reply ONLY with JSON in this shape:
                {"content": "the post text",
                 "hashtags": "5 to 8 hashtags separated by spaces",
                 "engagementTips": "3 to 5 short tips, one per line"}
                """.formatted(achievement, tone, String.join(", ", skills));

        String json = callGemini(prompt, true);

        try {
            JsonNode node = mapper.readTree(json.replaceAll("```json|```", "").trim());
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("content", node.path("content").asText(""));
            result.put("hashtags", node.path("hashtags").asText(""));
            result.put("engagementTips", node.path("engagementTips").asText(""));
            return result;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini returned an unreadable response");
        }
    }

    /** Sends the prompt to Gemini and returns the text of the first candidate. */
    private String callGemini(String prompt, boolean jsonMode) {

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", 0.9); // higher = more varied posts
        if (jsonMode) {
            generationConfig.put("responseMimeType", "application/json");
        }

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", generationConfig
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey); // key in header, not in the URL, so it isn't logged

        try {
            String response = postWithRetry(body, headers);

            JsonNode text = mapper.readTree(response)
                    .path("candidates").path(0).path("content").path("parts").path(0).path("text");

            if (text.isMissingNode() || text.asText().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini returned no text");
            }
            return text.asText();

        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach Gemini: " + e.getMessage());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Gemini call failed");
        }
    }

    /**
     * Retries temporary errors (503 busy, 429 rate limit, 500) up to 3 times per model,
     * then moves on to the fallback model if one is configured.
     */
    private String postWithRetry(Map<String, Object> body, HttpHeaders headers) {
        List<String> models = fallbackModel == null || fallbackModel.isBlank()
                ? List.of(model)
                : List.of(model, fallbackModel);

        HttpStatusCodeException last = null;
        for (String m : models) {
            for (int attempt = 1; attempt <= 3; attempt++) {
                try {
                    return restTemplate.postForObject(
                            BASE_URL + m + ":generateContent",
                            new HttpEntity<>(body, headers),
                            String.class);
                } catch (HttpStatusCodeException e) {
                    last = e;
                    int status = e.getStatusCode().value();
                    if (status == 404) break;                                  // model gone: try next model
                    if (status != 503 && status != 429 && status != 500) throw e; // real error: stop
                    try { Thread.sleep(attempt * 2000L); }                      // wait 2s, 4s, 6s
                    catch (InterruptedException ie) { Thread.currentThread().interrupt(); throw e; }
                }
            }
        }
        throw last;
    }
}