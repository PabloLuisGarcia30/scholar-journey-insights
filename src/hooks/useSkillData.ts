import { useMemo } from "react";
import { type SkillScore, type ContentSkill, type SubjectSkill } from "@/services/examService";

interface UseSkillDataProps {
  contentSkillScores: SkillScore[];
  subjectSkillScores: SkillScore[];
  classContentSkills: ContentSkill[];
  classSubjectSkills: SubjectSkill[];
  isClassView: boolean;
  isGrade10MathClass: () => boolean;
}

export function useSkillData({
  contentSkillScores,
  subjectSkillScores,
  classContentSkills,
  classSubjectSkills,
  isClassView,
  isGrade10MathClass
}: UseSkillDataProps) {
  
  // Create comprehensive skill data combining test scores with class skills
  const comprehensiveSkillData = useMemo(() => {
    console.log('Getting comprehensive skill data:', { 
      isClassView, 
      isGrade10Math: isGrade10MathClass(),
      classContentSkillsLength: classContentSkills.length, 
      contentSkillScoresLength: contentSkillScores.length,
      'Class Content Skills:': classContentSkills.map(s => ({ topic: s.topic, skill: s.skill_name })),
      'Content skill scores:': contentSkillScores.map(s => s.skill_name)
    });

    // For any Grade 10 Math context, prioritize content skill scores (includes Betty's mock data)
    if (isGrade10MathClass() && contentSkillScores.length > 0) {
      console.log('Using content skill scores for Grade 10 Math (includes mock data if applicable)');
      return contentSkillScores;
    }

    // If we're in class view and have class content skills, show all skills for the class
    if (isClassView && classContentSkills.length > 0) {
      console.log('Using linked class content skills');
      // Create a map of skill scores by skill name
      const scoreMap = new Map(contentSkillScores.map(score => [score.skill_name, score]));

      // Combine class skills with actual scores, showing 0 for untested skills
      return classContentSkills.map(skill => {
        const existingScore = scoreMap.get(skill.skill_name);
        return existingScore || {
          id: `placeholder-${skill.id}`,
          test_result_id: '',
          skill_name: skill.skill_name,
          score: 0, // Show 0% for skills not yet tested
          points_earned: 0,
          points_possible: 0,
          created_at: ''
        };
      });
    }

    // Otherwise, just return the content skill scores from tests
    console.log('Using test result content skill scores only');
    return contentSkillScores;
  }, [contentSkillScores, classContentSkills, isClassView, isGrade10MathClass]);

  // Create comprehensive subject skill data combining test scores with class skills
  const comprehensiveSubjectSkillData = useMemo(() => {
    console.log('Getting comprehensive subject skill data:', { 
      isClassView, 
      isGrade10Math: isGrade10MathClass(),
      classSubjectSkillsLength: classSubjectSkills.length, 
      subjectSkillScoresLength: subjectSkillScores.length,
      'Class Subject Skills:': classSubjectSkills.map(s => s.skill_name),
      'Subject skill scores:': subjectSkillScores.map(s => s.skill_name)
    });

    // If we're in class view and have class subject skills, show all skills for the class
    if (isClassView && classSubjectSkills.length > 0) {
      console.log('Using linked class subject skills');
      // Create a map of skill scores by skill name
      const scoreMap = new Map(subjectSkillScores.map(score => [score.skill_name, score]));

      // Combine class skills with actual scores, showing 0 for untested skills
      return classSubjectSkills.map(skill => {
        const existingScore = scoreMap.get(skill.skill_name);
        return existingScore || {
          id: `placeholder-${skill.id}`,
          test_result_id: '',
          skill_name: skill.skill_name,
          score: 0, // Show 0% for skills not yet tested
          points_earned: 0,
          points_possible: 0,
          created_at: ''
        };
      });
    }

    // Otherwise, just return the subject skill scores from tests
    console.log('Using test result subject skill scores only');
    return subjectSkillScores;
  }, [subjectSkillScores, classSubjectSkills, isClassView, isGrade10MathClass]);

  // Group skills by topic for better organization
  const groupedSkills = useMemo(() => {
    const skills = comprehensiveSkillData;
    
    if (!isClassView) return { 'General Skills': skills };

    // For Grade 10 Math with mock data or actual skills, create topics based on skill names
    if (isGrade10MathClass() && skills.length > 0) {
      const grouped: Record<string, typeof skills> = {};
      
      skills.forEach(skillScore => {
        // Determine topic based on skill name for Betty's mock data
        let topic = 'General Skills';
        
        const skillName = skillScore.skill_name;
        if (skillName.includes('Factoring') || skillName.includes('Systems of Equations') || 
            skillName.includes('Function') || skillName.includes('Linear') || 
            skillName.includes('Quadratic') || skillName.includes('Exponential')) {
          topic = 'ALGEBRA AND FUNCTIONS';
        } else if (skillName.includes('Triangle') || skillName.includes('Area') || 
                   skillName.includes('Perimeter') || skillName.includes('Volume') || 
                   skillName.includes('Surface Area') || skillName.includes('Coordinate') || 
                   skillName.includes('Geometric')) {
          topic = 'GEOMETRY';
        } else if (skillName.includes('Trigonometric') || skillName.includes('Triangle') || 
                   skillName.includes('Unit Circle') || skillName.includes('Angle')) {
          topic = 'TRIGONOMETRY';
        } else if (skillName.includes('Statistical') || skillName.includes('Probability') || 
                   skillName.includes('Data') || skillName.includes('Graph') || 
                   skillName.includes('Predictions')) {
          topic = 'DATA ANALYSIS AND PROBABILITY';
        } else if (skillName.includes('Modeling') || skillName.includes('Critical Thinking') || 
                   skillName.includes('Pattern') || skillName.includes('Logical') || 
                   skillName.includes('Problem-Solving')) {
          topic = 'PROBLEM SOLVING AND REASONING';
        }
        
        if (!grouped[topic]) {
          grouped[topic] = [];
        }
        grouped[topic].push(skillScore);
      });

      // Sort topics in the exact order specified for Grade 10 Math
      const orderedTopics = [
        'ALGEBRA AND FUNCTIONS',
        'GEOMETRY', 
        'TRIGONOMETRY',
        'DATA ANALYSIS AND PROBABILITY',
        'PROBLEM SOLVING AND REASONING'
      ];

      const orderedGrouped: Record<string, typeof skills> = {};
      orderedTopics.forEach(topic => {
        if (grouped[topic]) {
          // Sort skills within each topic
          const skillOrders: Record<string, string[]> = {
            'ALGEBRA AND FUNCTIONS': [
              'Factoring Polynomials',
              'Solving Systems of Equations',
              'Understanding Function Notation',
              'Graphing Linear and Quadratic Functions',
              'Working with Exponential Functions'
            ],
            'GEOMETRY': [
              'Properties of Similar Triangles',
              'Area and Perimeter Calculations',
              'Volume and Surface Area of 3D Objects',
              'Coordinate Geometry',
              'Geometric Transformations'
            ],
            'TRIGONOMETRY': [
              'Basic Trigonometric Ratios',
              'Solving Right Triangle Problems',
              'Unit Circle and Angle Measures',
              'Trigonometric Identities',
              'Applications of Trigonometry'
            ],
            'DATA ANALYSIS AND PROBABILITY': [
              'Statistical Measures and Interpretation',
              'Probability Calculations',
              'Data Collection and Sampling',
              'Creating and Interpreting Graphs',
              'Making Predictions from Data'
            ],
            'PROBLEM SOLVING AND REASONING': [
              'Mathematical Modeling',
              'Critical Thinking in Mathematics',
              'Pattern Recognition',
              'Logical Reasoning',
              'Problem-Solving Strategies'
            ]
          };

          if (skillOrders[topic]) {
            const order = skillOrders[topic];
            grouped[topic].sort((a, b) => {
              const aIndex = order.indexOf(a.skill_name);
              const bIndex = order.indexOf(b.skill_name);
              if (aIndex === -1 && bIndex === -1) return 0;
              if (aIndex === -1) return 1;
              if (bIndex === -1) return -1;
              return aIndex - bIndex;
            });
          }
          
          orderedGrouped[topic] = grouped[topic];
        }
      });

      // Add any remaining topics that weren't in our ordered list
      Object.keys(grouped).forEach(topic => {
        if (!orderedTopics.includes(topic)) {
          orderedGrouped[topic] = grouped[topic];
        }
      });

      return orderedGrouped;
    }

    // For other classes, use the class content skills for grouping
    const skillsForGrouping = classContentSkills;
    if (!skillsForGrouping.length) return { 'General Skills': skills };

    const grouped: Record<string, typeof skills> = {};
    
    skills.forEach(skillScore => {
      const contentSkill = skillsForGrouping.find(cs => cs.skill_name === skillScore.skill_name);
      const topic = contentSkill?.topic || 'General Skills';
      
      if (!grouped[topic]) {
        grouped[topic] = [];
      }
      grouped[topic].push(skillScore);
    });

    return grouped;
  }, [comprehensiveSkillData, classContentSkills, isClassView, isGrade10MathClass]);

  return {
    comprehensiveSkillData,
    comprehensiveSubjectSkillData,
    groupedSkills
  };
}
