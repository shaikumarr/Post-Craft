# PostCraft: AI LinkedIn Content Creator

PostCraft turns a short achievement, a tone and a list of skills into a ready-to-publish LinkedIn post. It also suggests hashtags and engagement tips, and saves every generated post to a database.

## Features
- Generates a unique LinkedIn post for each request using the Gemini API
- Six tones: Professional, Inspirational, Casual, Humble, Enthusiastic, Storytelling
- Hashtag suggestions and engagement tips for every post
- Post history saved in a database
- Responsive, LinkedIn-style interface with copy-to-clipboard, character counters and toast notifications

## Tech stack
- **Backend:** Java 17, Spring Boot 3.5, Spring Data JPA
- **AI:** Google Gemini API (`generateContent`)
- **Database:** configured in `application.properties` (table: `post_history`)
- **Frontend:** HTML, CSS and JavaScript only, served from `src/main/resources/static`

## How it works
1. The page sends `POST /api/linkedin/generate` with `{ achievement, tone, skills[] }`.
2. `LinkedinController` passes the request to `LinkedinAgentService`.
3. `GeminiService` builds a prompt, calls Gemini (with retries and an optional fallback model) and parses the JSON reply.
4. `LinkedinAgentService` saves the post through `PostHistoryRepository` and returns `{ content, hashtags, engagementTips }`.
5. The page shows the post, hashtags and tips.

## Project structure
```
com.linkedin_agent_ai
├── controller   LinkedinController
├── service      LinkedinAgentService, GeminiService
├── dto          PostRequest, PostResponse
├── entity       PostHistory
└── repository   PostHistoryRepository
```

## Configuration (`application.properties`)
```
server.port=9090
gemini.api.key=YOUR_KEY_HERE
gemini.model=gemini-3.8-flash
gemini.fallback-model=gemini-3.1-flash-lite
spring.jpa.hibernate.ddl-auto=update
```
Add your database url, username and password as well. Never commit a real API key to Git.

## Run
1. Add your Gemini key and database settings to `application.properties`.
2. Start the Spring Boot application.
3. Open `http://localhost:9090`.

## Notes
- Gemini model names are retired from time to time. If you get a 404, update `gemini.model`.
- Generated posts are drafts. Review them before publishing.
