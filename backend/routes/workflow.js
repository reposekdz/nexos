const express = require('express');
const {
  WorkflowTemplate,
  Workflow,
  WorkflowStepExecution,
  ApprovalChain,
  WorkflowTrigger,
  WorkflowSchedule,
  WorkflowSimulation,
  WorkflowAnalytics,
  WorkflowRollback,
  WorkflowEventLog
} = require('../models/Workflow');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/templates', auth, async (req, res) => {
  try {
    const template = new WorkflowTemplate({
      ...req.body,
      createdBy: req.userId,
      tenantId: req.tenantId
    });
    await template.save();
    
    await WorkflowEventLog.create({
      workflow: null,
      template: template._id,
      event: 'template_created',
      actor: req.userId,
      details: { name: template.name }
    });
    
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/templates', auth, async (req, res) => {
  try {
    const { category, isPublic, tags } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {
      $or: [
        { createdBy: req.userId },
        { tenantId: req.tenantId },
        { isPublic: true }
      ],
      active: true
    };
    
    if (category) filter.category = category;
    if (isPublic !== undefined) filter.isPublic = isPublic === 'true';
    if (tags) filter.tags = { $in: tags.split(',') };
    
    const templates = await WorkflowTemplate.find(filter)
      .sort({ executionCount: -1, successRate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name avatar');
    
    const total = await WorkflowTemplate.countDocuments(filter);
    
    res.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/templates/:id', auth, async (req, res) => {
  try {
    const template = await WorkflowTemplate.findById(req.params.id)
      .populate('createdBy', 'name avatar');
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (!template.isPublic && template.createdBy._id.toString() !== req.userId && template.tenantId?.toString() !== req.tenantId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/templates/:id', auth, async (req, res) => {
  try {
    const template = await WorkflowTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (template.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    Object.assign(template, req.body);
    template.version += 1;
    await template.save();
    
    await WorkflowEventLog.create({
      template: template._id,
      event: 'template_updated',
      actor: req.userId,
      details: { version: template.version }
    });
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/templates/:id', auth, async (req, res) => {
  try {
    const template = await WorkflowTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (template.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    template.active = false;
    await template.save();
    
    res.json({ message: 'Template deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/workflows', auth, async (req, res) => {
  try {
    const template = await WorkflowTemplate.findById(req.body.template);
    
    if (!template || !template.active) {
      return res.status(404).json({ message: 'Template not found or inactive' });
    }
    
    const workflow = new Workflow({
      workflowId: `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      template: req.body.template,
      name: req.body.name || template.name,
      priority: req.body.priority,
      initiator: req.userId,
      tenantId: req.tenantId,
      variables: req.body.variables,
      context: req.body.context,
      metadata: req.body.metadata,
      tags: req.body.tags
    });
    
    await workflow.save();
    
    template.executionCount += 1;
    await template.save();
    
    await WorkflowEventLog.create({
      workflow: workflow._id,
      template: template._id,
      event: 'workflow_started',
      actor: req.userId,
      details: { workflowId: workflow.workflowId }
    });
    
    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/workflows', auth, async (req, res) => {
  try {
    const { status, priority, template } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {
      $or: [
        { initiator: req.userId },
        { tenantId: req.tenantId }
      ]
    };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (template) filter.template = template;
    
    const workflows = await Workflow.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('template', 'name category icon')
      .populate('initiator', 'name avatar');
    
    const total = await Workflow.countDocuments(filter);
    
    res.json({
      workflows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/workflows/:id', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
      .populate('template')
      .populate('initiator', 'name avatar');
    
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    if (workflow.initiator._id.toString() !== req.userId && workflow.tenantId?.toString() !== req.tenantId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const steps = await WorkflowStepExecution.find({ workflow: workflow._id })
      .sort({ startedAt: 1 })
      .populate('assignedTo', 'name avatar')
      .populate('completedBy', 'name avatar');
    
    const approvalChains = await ApprovalChain.find({ workflow: workflow._id })
      .populate('approvals.approver', 'name avatar');
    
    res.json({
      workflow,
      steps,
      approvalChains
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/workflows/:id/start', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    if (!workflow.canTransitionTo('running')) {
      return res.status(400).json({ message: 'Cannot start workflow in current state' });
    }
    
    workflow.status = 'running';
    workflow.startedAt = new Date();
    await workflow.save();
    
    await WorkflowEventLog.create({
      workflow: workflow._id,
      event: 'workflow_running',
      actor: req.userId,
      details: { startedAt: workflow.startedAt }
    });
    
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/workflows/:id/pause', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    if (!workflow.canTransitionTo('paused')) {
      return res.status(400).json({ message: 'Cannot pause workflow in current state' });
    }
    
    workflow.status = 'paused';
    workflow.pausedAt = new Date();
    await workflow.save();
    
    await WorkflowEventLog.create({
      workflow: workflow._id,
      event: 'workflow_paused',
      actor: req.userId,
      details: { reason: req.body.reason }
    });
    
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/workflows/:id/resume', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    if (!workflow.canTransitionTo('running')) {
      return res.status(400).json({ message: 'Cannot resume workflow in current state' });
    }
    
    workflow.status = 'running';
    workflow.pausedAt = null;
    await workflow.save();
    
    await WorkflowEventLog.create({
      workflow: workflow._id,
      event: 'workflow_resumed',
      actor: req.userId
    });
    
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/workflows/:id/cancel', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    if (!workflow.canTransitionTo('cancelled')) {
      return res.status(400).json({ message: 'Cannot cancel workflow in current state' });
    }
    
    workflow.status = 'cancelled';
    workflow.cancelledAt = new Date();
    await workflow.save();
    
    await WorkflowEventLog.create({
      workflow: workflow._id,
      event: 'workflow_cancelled',
      actor: req.userId,
      details: { reason: req.body.reason }
    });
    
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/workflows/:id/complete', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    if (!workflow.canTransitionTo('completed')) {
      return res.status(400).json({ message: 'Cannot complete workflow in current state' });
    }
    
    workflow.status = 'completed';
    workflow.completedAt = new Date();
    workflow.calculateDuration();
    await workflow.save();
    
    const template = await WorkflowTemplate.findById(workflow.template);
    if (template) {
      const completedWorkflows = await Workflow.countDocuments({
        template: template._id,
        status: 'completed'
      });
      const totalWorkflows = await Workflow.countDocuments({
        template: template._id,
        status: { $in: ['completed', 'failed', 'cancelled'] }
      });
      template.successRate = (completedWorkflows / totalWorkflows) * 100;
      await template.save();
    }
    
    await WorkflowEventLog.create({
      workflow: workflow._id,
      event: 'workflow_completed',
      actor: req.userId,
      details: { duration: workflow.durationMs }
    });
    
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/steps', auth, async (req, res) => {
  try {
    const step = new WorkflowStepExecution({
      ...req.body,
      workflow: req.body.workflowId
    });
    await step.save();
    
    const workflow = await Workflow.findById(req.body.workflowId);
    if (workflow) {
      workflow.currentStep = step.stepId;
      await workflow.save();
    }
    
    await WorkflowEventLog.create({
      workflow: req.body.workflowId,
      event: 'step_started',
      actor: req.userId,
      details: { stepId: step.stepId, stepName: step.stepName }
    });
    
    res.status(201).json(step);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/steps/:id/complete', auth, async (req, res) => {
  try {
    const step = await WorkflowStepExecution.findById(req.params.id);
    
    if (!step) {
      return res.status(404).json({ message: 'Step not found' });
    }
    
    step.status = 'completed';
    step.completedAt = new Date();
    step.completedBy = req.userId;
    step.output = req.body.output;
    step.calculateDuration();
    await step.save();
    
    const workflow = await Workflow.findById(step.workflow);
    if (workflow) {
      workflow.completedSteps.push(step.stepId);
      await workflow.save();
    }
    
    await WorkflowEventLog.create({
      workflow: step.workflow,
      event: 'step_completed',
      actor: req.userId,
      details: { stepId: step.stepId, duration: step.durationMs }
    });
    
    res.json(step);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/steps/:id/fail', auth, async (req, res) => {
  try {
    const step = await WorkflowStepExecution.findById(req.params.id);
    
    if (!step) {
      return res.status(404).json({ message: 'Step not found' });
    }
    
    step.status = 'failed';
    step.error = req.body.error;
    step.retryCount += 1;
    await step.save();
    
    const workflow = await Workflow.findById(step.workflow);
    if (workflow) {
      workflow.failedSteps.push({
        stepId: step.stepId,
        error: req.body.error,
        timestamp: new Date(),
        retryCount: step.retryCount
      });
      
      if (step.retryCount >= step.maxRetries) {
        workflow.status = 'failed';
      }
      
      await workflow.save();
    }
    
    await WorkflowEventLog.create({
      workflow: step.workflow,
      event: 'step_failed',
      actor: req.userId,
      details: { stepId: step.stepId, error: req.body.error, retryCount: step.retryCount }
    });
    
    res.json(step);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/approvals', auth, async (req, res) => {
  try {
    const approvalChain = new ApprovalChain({
      ...req.body,
      workflow: req.body.workflowId,
      initiator: req.userId
    });
    await approvalChain.save();
    
    await WorkflowEventLog.create({
      workflow: req.body.workflowId,
      event: 'approval_chain_created',
      actor: req.userId,
      details: { chainId: approvalChain.chainId, type: approvalChain.type }
    });
    
    res.status(201).json(approvalChain);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/approvals', auth, async (req, res) => {
  try {
    const { status, workflow } = req.query;
    
    const filter = {
      'approvals.approver': req.userId
    };
    
    if (status) filter.status = status;
    if (workflow) filter.workflow = workflow;
    
    const approvalChains = await ApprovalChain.find(filter)
      .sort({ createdAt: -1 })
      .populate('workflow', 'name workflowId')
      .populate('initiator', 'name avatar')
      .populate('approvals.approver', 'name avatar');
    
    res.json(approvalChains);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/approvals/:id/approve', auth, async (req, res) => {
  try {
    const approvalChain = await ApprovalChain.findById(req.params.id);
    
    if (!approvalChain) {
      return res.status(404).json({ message: 'Approval chain not found' });
    }
    
    const approval = approvalChain.approvals.find(
      a => a.approver.toString() === req.userId && a.status === 'pending'
    );
    
    if (!approval) {
      return res.status(403).json({ message: 'Not authorized to approve or already processed' });
    }
    
    approval.status = 'approved';
    approval.respondedAt = new Date();
    approval.comments = req.body.comments;
    
    approvalChain.advanceChain();
    await approvalChain.save();
    
    await WorkflowEventLog.create({
      workflow: approvalChain.workflow,
      event: 'approval_granted',
      actor: req.userId,
      details: { chainId: approvalChain.chainId, comments: req.body.comments }
    });
    
    res.json(approvalChain);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/approvals/:id/reject', auth, async (req, res) => {
  try {
    const approvalChain = await ApprovalChain.findById(req.params.id);
    
    if (!approvalChain) {
      return res.status(404).json({ message: 'Approval chain not found' });
    }
    
    const approval = approvalChain.approvals.find(
      a => a.approver.toString() === req.userId && a.status === 'pending'
    );
    
    if (!approval) {
      return res.status(403).json({ message: 'Not authorized to reject or already processed' });
    }
    
    approval.status = 'rejected';
    approval.respondedAt = new Date();
    approval.comments = req.body.comments;
    approvalChain.status = 'rejected';
    approvalChain.completedAt = new Date();
    await approvalChain.save();
    
    const workflow = await Workflow.findById(approvalChain.workflow);
    if (workflow) {
      workflow.status = 'failed';
      await workflow.save();
    }
    
    await WorkflowEventLog.create({
      workflow: approvalChain.workflow,
      event: 'approval_rejected',
      actor: req.userId,
      details: { chainId: approvalChain.chainId, comments: req.body.comments }
    });
    
    res.json(approvalChain);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/triggers', auth, async (req, res) => {
  try {
    const trigger = new WorkflowTrigger({
      ...req.body,
      template: req.body.templateId,
      createdBy: req.userId,
      tenantId: req.tenantId
    });
    await trigger.save();
    
    res.status(201).json(trigger);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/triggers', auth, async (req, res) => {
  try {
    const { type, enabled } = req.query;
    
    const filter = {
      $or: [
        { createdBy: req.userId },
        { tenantId: req.tenantId }
      ]
    };
    
    if (type) filter.type = type;
    if (enabled !== undefined) filter.enabled = enabled === 'true';
    
    const triggers = await WorkflowTrigger.find(filter)
      .populate('template', 'name category icon');
    
    res.json(triggers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/triggers/:id', auth, async (req, res) => {
  try {
    const trigger = await WorkflowTrigger.findById(req.params.id);
    
    if (!trigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }
    
    if (trigger.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    Object.assign(trigger, req.body);
    await trigger.save();
    
    res.json(trigger);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/schedules', auth, async (req, res) => {
  try {
    const schedule = new WorkflowSchedule({
      ...req.body,
      template: req.body.templateId,
      createdBy: req.userId,
      tenantId: req.tenantId
    });
    schedule.calculateNextRun();
    await schedule.save();
    
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/schedules', auth, async (req, res) => {
  try {
    const { enabled } = req.query;
    
    const filter = {
      $or: [
        { createdBy: req.userId },
        { tenantId: req.tenantId }
      ]
    };
    
    if (enabled !== undefined) filter.enabled = enabled === 'true';
    
    const schedules = await WorkflowSchedule.find(filter)
      .sort({ nextRun: 1 })
      .populate('template', 'name category icon');
    
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/simulations', auth, async (req, res) => {
  try {
    const simulation = new WorkflowSimulation({
      ...req.body,
      template: req.body.templateId,
      initiator: req.userId,
      tenantId: req.tenantId
    });
    await simulation.save();
    
    res.status(201).json(simulation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/simulations/:id', auth, async (req, res) => {
  try {
    const simulation = await WorkflowSimulation.findById(req.params.id)
      .populate('template', 'name steps');
    
    if (!simulation) {
      return res.status(404).json({ message: 'Simulation not found' });
    }
    
    res.json(simulation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/analytics', auth, async (req, res) => {
  try {
    const { template, startDate, endDate } = req.query;
    
    const filter = {
      tenantId: req.tenantId
    };
    
    if (template) filter.template = template;
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };
    
    const analytics = await WorkflowAnalytics.find(filter)
      .sort({ createdAt: -1 })
      .populate('template', 'name category');
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/analytics/generate', auth, async (req, res) => {
  try {
    const { templateId, startDate, endDate } = req.body;
    
    const workflows = await Workflow.find({
      template: templateId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });
    
    const analytics = new WorkflowAnalytics({
      template: templateId,
      period: {
        start: new Date(startDate),
        end: new Date(endDate)
      },
      metrics: {
        totalExecutions: workflows.length,
        completedExecutions: workflows.filter(w => w.status === 'completed').length,
        failedExecutions: workflows.filter(w => w.status === 'failed').length,
        cancelledExecutions: workflows.filter(w => w.status === 'cancelled').length,
        avgDuration: workflows.reduce((sum, w) => sum + (w.durationMs || 0), 0) / workflows.length
      },
      tenantId: req.tenantId
    });
    
    analytics.calculateCompletionRate();
    analytics.calculateFailureRate();
    await analytics.save();
    
    res.status(201).json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/rollback', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.body.workflowId);
    
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    const rollback = new WorkflowRollback({
      workflow: workflow._id,
      fromStatus: workflow.status,
      toStatus: 'rolled_back',
      reason: req.body.reason,
      snapshot: {
        status: workflow.status,
        currentStep: workflow.currentStep,
        completedSteps: workflow.completedSteps,
        variables: workflow.variables
      },
      initiatedBy: req.userId
    });
    
    workflow.status = 'rolled_back';
    await workflow.save();
    await rollback.save();
    
    await WorkflowEventLog.create({
      workflow: workflow._id,
      event: 'workflow_rolled_back',
      actor: req.userId,
      details: { reason: req.body.reason }
    });
    
    res.json(rollback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/logs', auth, async (req, res) => {
  try {
    const { workflow, event } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const filter = {};
    
    if (workflow) filter.workflow = workflow;
    if (event) filter.event = event;
    
    const logs = await WorkflowEventLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', 'name avatar')
      .populate('workflow', 'workflowId name')
      .populate('template', 'name');
    
    const total = await WorkflowEventLog.countDocuments(filter);
    
    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    const totalWorkflows = await Workflow.countDocuments({ tenantId: req.tenantId });
    const activeWorkflows = await Workflow.countDocuments({ tenantId: req.tenantId, status: 'running' });
    const completedWorkflows = await Workflow.countDocuments({ tenantId: req.tenantId, status: 'completed' });
    const failedWorkflows = await Workflow.countDocuments({ tenantId: req.tenantId, status: 'failed' });
    
    const templates = await WorkflowTemplate.countDocuments({
      $or: [{ createdBy: req.userId }, { tenantId: req.tenantId }]
    });
    
    const avgDurationResult = await Workflow.aggregate([
      { $match: { tenantId: req.tenantId, status: 'completed', durationMs: { $exists: true } } },
      { $group: { _id: null, avgDuration: { $avg: '$durationMs' } } }
    ]);
    
    const avgDuration = avgDurationResult.length > 0 ? avgDurationResult[0].avgDuration : 0;
    
    res.json({
      totalWorkflows,
      activeWorkflows,
      completedWorkflows,
      failedWorkflows,
      templates,
      avgDuration,
      completionRate: totalWorkflows > 0 ? (completedWorkflows / totalWorkflows * 100).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
