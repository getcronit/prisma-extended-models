import util from "util";

const exec = util.promisify(require("child_process").exec);

export const generatePrismaClient = async () => {
  const { stdout, stderr } = await exec("yarn prisma generate");
  console.log("stdout:", stdout);
  console.log("stderr:", stderr);

  return stdout;
};
