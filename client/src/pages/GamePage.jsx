import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import ChatFeed from '../components/ChatFeed';
import ChatInput from '../components/ChatInput';
import PlayerHeader from '../components/PlayerHeader';
import EmergencyButton from '../components/EmergencyButton';
import RoleRevealPopup from '../components/RoleRevealPopup';

export default function GamePage() {
  const { roomCode: paramCode } = useParams();
  const navigate = useNavigate();
  const { roomCode, phase, discussionActive, myRole } = useGame();

  const [showRolePopup, setShowRolePopup] = useState(false);
  const popupShown = useRef(false);

  // Show role popup exactly once when role becomes available on this page
  useEffect(() => {
    if (myRole && !popupShown.current) {
      popupShown.current = true;
      setShowRolePopup(true);
    }
  }, [myRole]);

  useEffect(() => {
    if (!roomCode && phase === 'home') {
      navigate('/');
    }
  }, [roomCode, phase, navigate]);

  return (
    <div className="h-screen flex flex-col bg-ink-950 overflow-hidden">
      <PlayerHeader />

      <ChatFeed />

      {discussionActive && <ChatInput />}

      <EmergencyButton />

      {showRolePopup && myRole && (
        <RoleRevealPopup
          role={myRole}
          onDismiss={() => setShowRolePopup(false)}
        />
      )}
    </div>
  );
}
