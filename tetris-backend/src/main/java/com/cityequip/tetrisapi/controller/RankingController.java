package com.cityequip.tetrisapi.controller;

import com.cityequip.tetrisapi.model.Score;
import com.cityequip.tetrisapi.repository.ScoreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ranking")
@CrossOrigin(origins = "*") // Allow React app
public class RankingController {

    @Autowired
    private ScoreRepository scoreRepository;

    @GetMapping
    public List<Score> getRanking() {
        // Get all scores, sorted best to worst
        List<Score> allScores = scoreRepository.findAllByOrderByLinesDescLevelDesc();

        // Filter unique usernames (Keep first/best) then limit to 10
        java.util.Set<String> seenUsers = new java.util.HashSet<>();
        return allScores.stream()
                .filter(s -> seenUsers.add(s.getUsername())) // Returns true if added (unique)
                .limit(10)
                .collect(java.util.stream.Collectors.toList());
    }

    @PostMapping
    public Score addScore(@RequestBody Score score) {
        return scoreRepository.save(score);
    }
}
