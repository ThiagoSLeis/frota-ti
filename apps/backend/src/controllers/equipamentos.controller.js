import { equipamentosService } from '../services/equipamentos.service.js';

export const equipamentosController = {
  async index(req, res) {
    const equipamentos = await equipamentosService.list({ busca: req.query.busca ?? req.query.q });
    res.json(equipamentos);
  },

  async show(req, res) {
    res.json(await equipamentosService.getById(req.params.id));
  },

  async summary(req, res) {
    res.json(await equipamentosService.summary());
  },

  async store(req, res) {
    const criado = await equipamentosService.create(req.body);
    res.status(201).location(`/api/equipamentos/${criado.id}`).json(criado);
  },

  async update(req, res) {
    res.json(await equipamentosService.update(req.params.id, req.body));
  },

  async destroy(req, res) {
    const removido = await equipamentosService.remove(req.params.id);
    res.json({ removido: true, equipamento: removido });
  },
};
