import { Entity } from '../../entity';

class TestEntity extends Entity<{ name: string; value: number }> {
  constructor(props: { name: string; value: number }, id?: string) {
    super(props, id);
  }
}

describe('Entity', () => {
  describe('constructor', () => {
    it('should create entity with props and auto-generated id when id is not provided', () => {
      const props = { name: 'Test', value: 42 };
      const entity = new TestEntity(props);

      expect(entity.props).toEqual(props);
      expect(entity.props).toBe(props);
      expect(entity.id).toBeDefined();
      expect(entity.id).toMatch(/^[a-f0-9]{24}$/);
    });

    it('should create entity with props and provided id when id is passed', () => {
      const props = { name: 'Test', value: 42 };
      const id = '507f1f77bcf86cd799439011';
      const entity = new TestEntity(props, id);

      expect(entity.props).toEqual(props);
      expect(entity.id).toBe(id);
    });
  });

  describe('id', () => {
    it('should return the entity id', () => {
      const id = '507f1f77bcf86cd799439012';
      const entity = new TestEntity({ name: 'A', value: 1 }, id);

      expect(entity.id).toBe(id);
    });
  });

  describe('toJSON', () => {
    it('should return object with id and spread props', () => {
      const props = { name: 'Item', value: 100 };
      const id = '507f1f77bcf86cd799439013';
      const entity = new TestEntity(props, id);

      const json = entity.toJSON();

      expect(json).toEqual({
        id,
        name: 'Item',
        value: 100,
      });
      expect(json.id).toBe(id);
      expect(json.name).toBe(props.name);
      expect(json.value).toBe(props.value);
    });

    it('should include id at the beginning of the returned object', () => {
      const entity = new TestEntity({ name: 'X', value: 0 }, 'abc123');
      const json = entity.toJSON();

      expect(Object.keys(json)).toEqual(['id', 'name', 'value']);
      expect(json.id).toBe('abc123');
    });
  });

  describe('props', () => {
    it('should keep reference to the original props', () => {
      const props = { name: 'Ref', value: 99 };
      const entity = new TestEntity(props);

      expect(entity.props).toBe(props);
    });
  });
});
