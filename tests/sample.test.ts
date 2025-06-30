describe("Sample test in tests folder", () => {
  it("should multiply numbers correctly", () => {
    expect(2 * 3).toBe(6);
  });
});

describe("User logic", () => {
  it("should create a user with default values", () => {
    const user = { username: "testuser", coins: 0, items: [] };
    expect(user.username).toBe("testuser");
    expect(user.coins).toBe(0);
    expect(user.items).toEqual([]);
  });
});

describe("Leaderboard logic", () => {
  it("should add score to leaderboard", () => {
    const leaderboard = { scores: {} as { [key: string]: number } };
    function addScore(lb: typeof leaderboard, user: string, score: number) {
      lb.scores[user] = (lb.scores[user] || 0) + score;
    }
    addScore(leaderboard, "user1", 10);
    addScore(leaderboard, "user1", 5);
    expect(leaderboard.scores.user1).toBe(15);
    addScore(leaderboard, "user2", 7);
    expect(leaderboard.scores.user2).toBe(7);
  });
});

describe("Item usage", () => {
  it("should use an item and remove it from inventory", () => {
    const user = { items: ["sword", "shield"] };
    function useItem(u: any, item: string) {
      u.items = u.items.filter((i: string) => i !== item);
    }
    useItem(user, "sword");
    expect(user.items).toEqual(["shield"]);
  });
});

describe("Reward claim", () => {
  it("should add coins when claiming a reward", () => {
    const user = { coins: 10 };
    function claimReward(u: any, amount: number) {
      u.coins += amount;
    }
    claimReward(user, 20);
    expect(user.coins).toBe(30);
  });
});
