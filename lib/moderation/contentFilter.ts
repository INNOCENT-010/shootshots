// lib/moderation/contentFilter.ts
'use client'

export interface ModerationResult {
  isApproved: boolean
  toxicityScore: number
  hasProfanity: boolean
  hasHateSpeech: boolean
  hasRacism: boolean
  reasons: string[]
  sanitizedContent?: string
}

export interface BannedWord {
  word: string
  category: 'profanity' | 'hate_speech' | 'racism' | 'harassment' | 'spam'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Common banned words/phrases (you can expand this list)
const BANNED_WORDS: BannedWord[] = [
  // Profanity
  { word: 'fuck', category: 'profanity', severity: 'medium' },
  { word: 'shit', category: 'profanity', severity: 'low' },
  { word: 'asshole', category: 'profanity', severity: 'medium' },
  { word: 'bitch', category: 'profanity', severity: 'medium' },
  
  // Hate Speech
  { word: 'hate speech', category: 'hate_speech', severity: 'high' },
  { word: 'kill all', category: 'hate_speech', severity: 'critical' },
  { word: 'deserve to die', category: 'hate_speech', severity: 'critical' },
  
  // Racism
  { word: 'n-word', category: 'racism', severity: 'critical' },
  { word: 'racial slur', category: 'racism', severity: 'critical' },
  { word: 'white power', category: 'racism', severity: 'critical' },
  { word: 'black power', category: 'racism', severity: 'critical' },
  
  // Harassment
  { word: 'you suck', category: 'harassment', severity: 'medium' },
  { word: 'you\'re stupid', category: 'harassment', severity: 'medium' },
  { word: 'idiot', category: 'harassment', severity: 'low' },
  
  // Spam
  { word: 'http://', category: 'spam', severity: 'medium' },
  { word: 'https://', category: 'spam', severity: 'medium' },
  { word: 'check out my', category: 'spam', severity: 'low' },
  { word: 'buy now', category: 'spam', severity: 'medium' },
]

export class ContentModerator {
  private bannedWords: BannedWord[]
  
  constructor(customWords: BannedWord[] = []) {
    this.bannedWords = [...BANNED_WORDS, ...customWords]
  }
  
  moderate(content: string): ModerationResult {
    const lowerContent = content.toLowerCase()
    const result: ModerationResult = {
      isApproved: true,
      toxicityScore: 0,
      hasProfanity: false,
      hasHateSpeech: false,
      hasRacism: false,
      reasons: []
    }
    
    let score = 0
    let violations = 0
    
    // Check for banned words
    for (const banned of this.bannedWords) {
      if (lowerContent.includes(banned.word.toLowerCase())) {
        violations++
        
        // Update category flags
        switch (banned.category) {
          case 'profanity':
            result.hasProfanity = true
            break
          case 'hate_speech':
            result.hasHateSpeech = true
            break
          case 'racism':
            result.hasRacism = true
            break
        }
        
        // Calculate severity score
        const severityScore = {
          'low': 0.2,
          'medium': 0.4,
          'high': 0.7,
          'critical': 0.9
        }[banned.severity]
        
        score = Math.max(score, severityScore)
        result.reasons.push(`Found ${banned.category}: "${banned.word}"`)
      }
    }
    
    // Check for excessive caps (shouting)
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length
    if (capsRatio > 0.7 && content.length > 10) {
      score = Math.max(score, 0.3)
      result.reasons.push('Excessive capitalization (shouting)')
    }
    
    // Check for repetitive text (spam)
    const words = content.toLowerCase().split(/\s+/)
    const uniqueWords = new Set(words)
    if (words.length > 5 && uniqueWords.size / words.length < 0.3) {
      score = Math.max(score, 0.6)
      result.reasons.push('Repetitive text detected')
    }
    
    // Check for personal attacks patterns
    const attackPatterns = [
      /you (are|re) (a )?(stupid|idiot|dumb|moron)/i,
      /(shut up|go away|get lost)/i,
      /i hate you/i
    ]
    
    for (const pattern of attackPatterns) {
      if (pattern.test(content)) {
        score = Math.max(score, 0.5)
        result.reasons.push('Personal attack detected')
      }
    }
    
    // Set final score and approval
    result.toxicityScore = Math.min(score, 1.0)
    
    // Auto-reject if critical violations found
    if (result.hasRacism || result.hasHateSpeech || score > 0.7) {
      result.isApproved = false
    } else if (result.hasProfanity || score > 0.4) {
      // Send for manual review
      result.isApproved = false
    }
    
    return result
  }
  
  // Client-side pre-check before submission
  preCheck(content: string): { 
    isClean: boolean; 
    warning?: string;
    severity?: 'low' | 'medium' | 'high'
  } {
    const moderation = this.moderate(content)
    
    if (moderation.hasRacism || moderation.hasHateSpeech) {
      return {
        isClean: false,
        warning: 'Your comment contains inappropriate content that violates our community guidelines.',
        severity: 'high'
      }
    }
    
    if (moderation.hasProfanity || moderation.toxicityScore > 0.4) {
      return {
        isClean: false,
        warning: 'Your comment may be flagged for review. Please consider revising.',
        severity: 'medium'
      }
    }
    
    return { isClean: true }
  }
}

// Singleton instance
export const contentModerator = new ContentModerator()