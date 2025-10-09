import { nanoid } from 'nanoid';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const Component = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const boardId = nanoid();
    navigate(`/board/${boardId}`, { replace: true });
  }, [navigate]);

  return null;
};
