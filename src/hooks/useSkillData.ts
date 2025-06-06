import { useMemo } from "react";
import { type SkillScore, type ContentSkill, type SubjectSkill } from "@/services/examService";

interface UseSkillDataProps {
  contentSkillScores: SkillScore[];
  subjectSkillScores: SkillScore[];
  classContentSkills: ContentSkill[];
  classSubjectSkills: SubjectSkill[];
  isClassView: boolean;
  isGrade10MathClass: () => boolean;
  isGrade10ScienceClass?: () => boolean;
}

export function useSkillData({
  contentSkillScores,
  subjectSkillScores,
  classContentSkills,
  classSubjectSkills,
  isClassView,
  isGrade10MathClass,
  isGrade10ScienceClass = () => false
}: UseSkillDataProps) {
  
  // Create comprehensive skill data combining test scores with class skills
  const comprehensiveSkillData = useMemo(() => {
    console.log('Getting comprehensive skill data:', { 
      isClassView, 
      isGrade10Math: isGrade10MathClass(),
      isGrade10Science: isGrade10ScienceClass(),
      classContentSkillsLength: classContentSkills.length, 
      contentSkillScoresLength: contentSkillScores.length,
      'Class Content Skills:': classContentSkills.map(s => ({ topic: s.topic, skill: s.skill_name, subject: s.subject })),
      'Content skill scores:': contentSkillScores.map(s => s.skill_name)
    });

    // For any Grade 10 Math context, prioritize content skill scores (includes Pablo's mock data)
    if ((isGrade10MathClass() || isGrade10ScienceClass()) && contentSkillScores.length > 0) {
      console.log(`Using content skill scores for Grade 10 ${isGrade10MathClass() ? 'Math' : 'Science'} (includes mock data if applicable)`);
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
  }, [contentSkillScores, classContentSkills, isClassView, isGrade10MathClass, isGrade10ScienceClass]);

  // Create comprehensive subject skill data combining test scores with class skills
  const comprehensiveSubjectSkillData = useMemo(() => {
    console.log('Getting comprehensive subject skill data:', { 
      isClassView, 
      isGrade10Math: isGrade10MathClass(),
      isGrade10Science: isGrade10ScienceClass(),
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
  }, [subjectSkillScores, classSubjectSkills, isClassView, isGrade10MathClass, isGrade10ScienceClass]);

  // Group skills by topic for better organization
  const groupedSkills = useMemo(() => {
    const skills = comprehensiveSkillData;
    
    if (!isClassView) return { 'General Skills': skills };

    // For Grade 10 Math with mock data or actual skills, create topics based on skill names
    if (isGrade10MathClass() && skills.length > 0) {
      const grouped: Record<string, typeof skills> = {};
      
      skills.forEach(skillScore => {
        // Determine topic based on skill name for Pablo's mock data
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
    
    // For Grade 10 Science with actual skills, group by topic
    if (isGrade10ScienceClass() && skills.length > 0) {
      const grouped: Record<string, typeof skills> = {};
      
      // First check if skills have topic information from the database
      const hasPresetTopics = classContentSkills.some(skill => skill.topic && skill.skill_name === skills[0]?.skill_name);
      
      if (hasPresetTopics) {
        // If skills have topic info from database, use that for grouping
        skills.forEach(skillScore => {
          const contentSkill = classContentSkills.find(cs => cs.skill_name === skillScore.skill_name);
          const topic = contentSkill?.topic || 'General Skills';
          
          if (!grouped[topic]) {
            grouped[topic] = [];
          }
          grouped[topic].push(skillScore);
        });
      } else {
        // Otherwise, try to determine topics based on skill names
        skills.forEach(skillScore => {
          let topic = 'General Skills';
          
          const skillName = skillScore.skill_name;
          if (skillName.includes('Cell') || skillName.includes('DNA') || 
              skillName.includes('Genetic') || skillName.includes('Evolution') || 
              skillName.includes('Ecology') || skillName.includes('Body System')) {
            topic = 'BIOLOGY';
          } else if (skillName.includes('Atomic') || skillName.includes('Periodic Table') || 
                    skillName.includes('Chemical') || skillName.includes('Solution')) {
            topic = 'CHEMISTRY';
          } else if (skillName.includes('Motion') || skillName.includes('Force') || 
                    skillName.includes('Energy') || skillName.includes('Wave') || 
                    skillName.includes('Electricity') || skillName.includes('Nuclear')) {
            topic = 'PHYSICS';
          } else if (skillName.includes('Earth') || skillName.includes('Weather') || 
                    skillName.includes('Climate') || skillName.includes('Solar System') || 
                    skillName.includes('Rock') || skillName.includes('Mineral') ||
                    skillName.includes('Resources')) {
            topic = 'EARTH SCIENCE';
          } else if (skillName.includes('Experiment') || skillName.includes('Data Analysis') || 
                    skillName.includes('Scientific') || skillName.includes('Critical Thinking') || 
                    skillName.includes('Technology')) {
            topic = 'SCIENTIFIC METHOD';
          }
          
          if (!grouped[topic]) {
            grouped[topic] = [];
          }
          grouped[topic].push(skillScore);
        });
      }

      // Define ordered topics for Science
      const orderedScienceTopics = [
        'BIOLOGY',
        'CHEMISTRY',
        'PHYSICS',
        'EARTH SCIENCE',
        'SCIENTIFIC METHOD'
      ];
      
      const orderedGrouped: Record<string, typeof skills> = {};
      orderedScienceTopics.forEach(topic => {
        if (grouped[topic]) {
          orderedGrouped[topic] = grouped[topic];
        }
      });
      
      // Add any remaining topics not in our ordered list
      Object.keys(grouped).forEach(topic => {
        if (!orderedScienceTopics.includes(topic)) {
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
  }, [comprehensiveSkillData, classContentSkills, isClassView, isGrade10MathClass, isGrade10ScienceClass]);

  return {
    comprehensiveSkillData,
    comprehensiveSubjectSkillData,
    groupedSkills
  };
}
