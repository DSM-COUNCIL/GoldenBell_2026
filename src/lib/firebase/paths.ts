export const gamePath = (gameId: string) => `games/${gameId}`;
export const privateGameStatePath = (gameId: string) => `${gamePath(gameId)}/state`;
export const publicGamePath = (gameId: string) => `publicGames/${gameId}`;
export const publicGameStatePath = (gameId: string) => `${publicGamePath(gameId)}/state`;
export const publicQuestionsPath = (gameId: string) => `${publicGamePath(gameId)}/questions`;
export const publicQuestionPath = (gameId: string, questionId: string) =>
  `${publicQuestionsPath(gameId)}/${questionId}`;
export const participantsPath = (gameId: string) => `${gamePath(gameId)}/participants`;
export const participantPath = (gameId: string, participantId: string) =>
  `${participantsPath(gameId)}/${participantId}`;
export const privateQuestionsPath = (gameId: string) => `${gamePath(gameId)}/questions`;
export const privateQuestionPath = (gameId: string, questionId: string) =>
  `${privateQuestionsPath(gameId)}/${questionId}`;
export const answersPath = (gameId: string, questionId: string) =>
  `${gamePath(gameId)}/answers/${questionId}`;
export const answerPath = (gameId: string, questionId: string, participantId: string) =>
  `${answersPath(gameId, questionId)}/${participantId}`;
