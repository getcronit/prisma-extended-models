import util from "util";

const exec = util.promisify(require("child_process").exec);

export const generatePrismaClient = async (
  options: { pm: "yarn" | "npm" | "bun" } = { pm: "yarn" }
) => {
  let bin = "yarn";

  if (options.pm === "npm") {
    bin = "npx";
  } else if (options.pm === "bun") {
    bin = "bunx";
  }

  const { stdout, stderr } = await exec(`${bin} prisma generate`);
  console.log("stdout:", stdout);
  console.log("stderr:", stderr);

  return stdout;
};
