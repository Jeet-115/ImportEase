import * as scenarioModel from "./scenarioModel.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[ScenarioController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getAll = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const scenarios = await scenarioModel.findAll(companyId);
  res.json(scenarios);
});

export const getById = asyncHandler(async (req, res) => {
  const { companyId, scenarioId } = req.params;
  const scenario = await scenarioModel.findById(companyId, scenarioId);
  if (!scenario) {
    return res.status(404).json({ message: "Scenario not found" });
  }
  res.json(scenario);
});

export const create = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const scenario = await scenarioModel.create(companyId, req.body);
  res.status(201).json(scenario);
});

export const update = asyncHandler(async (req, res) => {
  const { companyId, scenarioId } = req.params;
  const scenario = await scenarioModel.updateById(companyId, scenarioId, req.body);
  if (!scenario) {
    return res.status(404).json({ message: "Scenario not found" });
  }
  res.json(scenario);
});

export const remove = asyncHandler(async (req, res) => {
  const { companyId, scenarioId } = req.params;
  const deleted = await scenarioModel.deleteById(companyId, scenarioId);
  if (!deleted) {
    return res.status(404).json({ message: "Scenario not found" });
  }
  res.json({ success: true });
});


