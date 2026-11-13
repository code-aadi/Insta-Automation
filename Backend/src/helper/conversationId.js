export const generateConversationId = (id1, id2) => {
  
  return [id1.toString(), id2.toString()].sort().join("_");
};


