const express = require('express');
const router = express.Router();

const {
  suspendUserAccountCtrl,
  unsuspendUserAccountCtrl
} = require('../controllers/adminController');

const { verifyTokenAndAdmin } = require('../middlewares/verifyJWTToken.middleware');



// suspended and unsuspended routes for admin
router.put('/suspend/:id', verifyTokenAndAdmin, suspendUserAccountCtrl);
router.put('/unsuspend/:id', verifyTokenAndAdmin, unsuspendUserAccountCtrl);

module.exports = router;
