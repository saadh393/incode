import { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";
import { useParams } from "react-router-dom";
import BattleLessonsBody from "../components/battle/battle-lesson-body";
import BattleSummery from "../components/battle/battle-summery";
import BattleCountdown from "../components/battle/BattleCountdown";
import BattleResultDialog from "../components/battle/BattleResultDialog";
import BattleStartDialog from "../components/battle/BattleStartDialog";
import { saveBattleResult } from "../repository/battle-result-api";
import { fetchLessons } from "../repository/lesson-api";
import { fetchQuests } from "../repository/quest-api";

function BattleZone() {
  const { questId } = useParams();
  const [quest, setQuest] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [lessonHistory, setLessonHistory] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typingStats, setTypingStats] = useState({});
  const [showStart, setShowStart] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);

  const handleStart = () => {
    setShowStart(false);
    setShowCountdown(true);
  };

  const handleCountdownDone = () => {
    setShowCountdown(false);
  };

  // Calculate point (same as BattleSummery)
  let point = 0,
    right = 0,
    wrong = 0,
    totalTime = 0;
  lessons.forEach((lesson) => {
    const id = lesson.id;
    const stats = typingStats[id] || {};
    const correct = Math.max((stats.chars || 0) - (stats.wrong || 0), 0);
    right += correct;
    wrong += stats.wrong || 0;
    totalTime += stats.time || 0;
    if (lessonHistory[id] && lesson.command && lessonHistory[id].length >= lesson.command.length) {
      point += 1;
    }
  });
  // 1 word = 5 chars, time in ms
  const totalWords = right / 5;
  const totalMinutes = totalTime / 60000;
  const wpm = totalMinutes > 0 ? Math.round(totalWords / totalMinutes) : 0;

  // Show result dialog when all lessons are done
  useEffect(() => {
    if (
      lessons.length > 0 &&
      lessons.every(
        (lesson) =>
          lessonHistory[lesson.id] && lesson.command && lessonHistory[lesson.id].length >= lesson.command.length
      )
    ) {
      setShowResult(true);
    }
  }, [lessons, lessonHistory]);

  useEffect(() => {
    if (
      showResult &&
      !resultSaved &&
      lessons.length > 0 &&
      lessons.every(
        (lesson) =>
          lessonHistory[lesson.id] && lesson.command && lessonHistory[lesson.id].length >= lesson.command.length
      )
    ) {
      // Save result to backend
      saveBattleResult({
        quest_id: quest?.id,
        point,
        right,
        wrong,
      })
        .then(() => setResultSaved(true))
        .catch(() => setResultSaved(false));
    }
  }, [showResult, resultSaved, lessons, lessonHistory, quest, point, right, wrong]);

  useEffect(() => {
    setLoading(true);
    fetchQuests()
      .then(async (quests) => {
        // Only published quests
        const published = quests.filter((q) => q.published);
        if (!published.length) {
          setError("No published quests available.");
          setLoading(false);
          return;
        }
        let selected = published[0];
        if (questId) {
          const found = published.find((q) => q.id === questId);
          if (found) selected = found;
          else {
            setError("Quest not found.");
            setLoading(false);
            return;
          }
        }
        setQuest(selected);
        // Fetch lessons for this quest
        try {
          const lessonList = await fetchLessons(selected.id);
          setLessons(lessonList);
          setActiveIndex(lessonList.length ? 0 : -1);
        } catch {
          setLessons([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load quest data.");
        setLoading(false);
      });
  }, [questId]);

  if (loading) return <div className="p-8 text-zinc-300 text-center text-lg">Loading quest and lessons...</div>;
  if (error) return <div className="p-8 text-red-500 text-center text-lg">{error}</div>;
  if (!quest || !lessons.length)
    return <div className="p-8 text-zinc-400 text-center text-lg">No lessons available for this quest.</div>;

  return (
    <div className="py-10 gap-10 max-w-7xl mx-auto">
      {showResult && (
        <ReactConfetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={400} />
      )}
      <BattleStartDialog open={showStart} onStart={handleStart} />
      <BattleCountdown start={showCountdown} onDone={handleCountdownDone} />
      <BattleResultDialog
        open={showResult}
        point={point}
        right={right}
        wrong={wrong}
        wpm={wpm}
        onClose={() => setShowResult(false)}
      />
      <div className="flex-1">
        {!showStart && !showCountdown && activeIndex < lessons.length && (
          <BattleLessonsBody
            lesson={lessons[activeIndex]}
            setActiveIndex={setActiveIndex}
            lessonHistory={lessonHistory}
            setLessonHistory={setLessonHistory}
            lessons={lessons}
            typingStats={typingStats}
            setTypingStats={setTypingStats}
          />
        )}
      </div>
      <BattleSummery lessons={lessons} lessonHistory={lessonHistory} typingStats={typingStats} />
    </div>
  );
}

export default BattleZone;
