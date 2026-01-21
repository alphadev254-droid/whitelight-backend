const Joi = require('joi');

const orderSchema = Joi.object({
  customerName: Joi.string().min(2).max(255).required(),
  customerPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  customerEmail: Joi.string().email().optional().allow(''),
  deliveryAddress: Joi.string().max(1000).optional().allow(''),
  orderNotes: Joi.string().max(1000).optional().allow(''),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      productName: Joi.string().required(),
      productPrice: Joi.number().positive().required(),
      size: Joi.number().integer().min(35).max(50).required(),
      selectedSizes: Joi.array().items(Joi.number().integer().min(35).max(50)).optional(),
      quantity: Joi.number().integer().min(1).max(10).required(),
      productImage: Joi.string().uri().optional().allow(''),
      referenceLink: Joi.string().optional().allow('')
    })
  ).min(1).required()
});

const validateOrder = (req, res, next) => {
  const { error } = orderSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

module.exports = { validateOrder };